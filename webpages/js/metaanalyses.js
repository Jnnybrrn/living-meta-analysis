(function (window, document) { // eslint-disable-line no-unused-vars
  'use strict';
  var lima = window.lima;
  var _ = lima._;

  function extractMetaanalysisTitleFromUrl() {
    // the path of a page for a metaanalysis will be '/email/title/*',
    // so extract the 'title' portion here:

    var start = window.location.pathname.indexOf('/', 1) + 1;
    if (start === 0) throw new Error('page url doesn\'t have a title');

    return window.location.pathname.substring(start, window.location.pathname.indexOf('/', start));
  }

  function updatePageURL() {
    // the path of a page for a metaanalysis will be '/email/title/*',
    // so update the 'title' portion here from the current paper (in case the user changes the title)
    var start = window.location.pathname.indexOf('/', 1) + 1;
    if (start === 0) throw new Error('page url doesn\'t have a title');

    var rest = window.location.pathname.indexOf('/', start);

    var url = window.location.pathname.substring(0, start) + currentMetaanalysis.title;
    if (rest > -1) url += window.location.pathname.substring(rest);

    window.history.replaceState({}, currentMetaanalysis.title, url);

    if (currentMetaanalysis.apiurl) currentMetaanalysisUrl = currentMetaanalysis.apiurl;
  }

  function createPageURL(email, title) {
    return '/' + email + '/' + title;
  }

/* ADD MACRO FOR meta-analysis HERE
*/

  function requestAndFillMetaanalysisList() {
    lima.getGapiIDToken()
    .then(function (idToken) {
      var email = lima.extractUserProfileEmailFromUrl();
      return fetch('/api/metaanalyses/' + email, _.idTokenToFetchOptions(idToken));
    })
    .then(function (response) {
      if (response.status === 404) return [];
      else return _.fetchJson(response);
    })
    .then(fillMetaanalysissList)
    .catch(function (err) {
      console.error("problem getting metaanalyses");
      console.error(err);
      _.apiFail();
    });
  }

  function fillMetaanalysissList(metaanalyses) {
    var list = _.findEl('.metaanalysis.list > ul');
    list.innerHTML = '';

    if (metaanalyses.length) {
      // todo sort
      metaanalyses.forEach(function (metaanalysis) {
        var li = _.cloneTemplate('metaanalysis-list-item-template');
        _.fillEls(li, '.name', metaanalysis.title);
        _.fillEls(li, '.reference', paper.reference);
        _.setProps(li, '.reference', 'title', paper.reference);
        _.fillEls(li, '.description', metaanalysis.description);
        _.setProps(li, '.description', 'title', metaanalysis.description);
        _.setProps(li, 'a.mainlink', 'href', metaanalysis.title);
        _.fillTags(li, '.tags', metaanalysis.tags);
        list.appendChild(li);
      });
    } else {
      list.appendChild(_.cloneTemplate('empty-list-template'));
    }

    _.setYouOrName();
  }

/* ADD MACRO FOR meta-analysis HERE
*/

var currentMetaanalysisUrl, currentMetaanalysis;

function requestAndFillMetaanalysis() {
  var email = lima.extractUserProfileEmailFromUrl();
  var title = lima.extractMetaanalysisTitleFromUrl();
  _.fillEls('#metaanalysis .title', title);

  lima.getPapers(); // TODO: not yet implemented

  lima.getColumns() // todo getColumns could run in parallel with everything before updatePaperView
  .then(lima.getGapiIDToken)
  .then(function (idToken) {
    currentMetaanalysisUrl = '/api/metaanalyses/' + email + '/' + title;
    return fetch(currentMetaanalysisUrl, _.idTokenToFetchOptions(idToken));
  })
  .then(function (response) {
    if (response.status === 404) _.notFound();
    else return _.fetchJson(response);
  })
  .then(updateMetaanalysisView)
  .then(function() {
    _.removeClass('body', 'loading');
    lima.onSignInChange(updateMetaanalysisView);
  })
  .catch(function (err) {
    console.error("problem getting metaanalysis");
    console.error(err);
    throw _.apiFail();
  })
  .then(loadAllTitles); // ignoring any errors here
}

  function Metaanalysis() {}
  Metaanalysis.prototype.save = saveMetaanalysis;

  // TODO: Revisit this function, think needs AfterPaperSave also..
  function updateAfterColumnSave() {
    // clean experiment data of new columns that got new ID when they were saved
    currentMetaanalysis.experiments.forEach(function (experiment) {
      if (experiment.data) Object.keys(experiment.data).forEach(function (key) {
        var col = lima.columns[key];
        if (col && col.id !== key) {
          experiment.data[col.id] = experiment.data[key];
          delete experiment.data[key];
        }
      });
    });

    // clean columnOrder the same way
    if (Array.isArray(currentMetaanalysis.columnOrder)) currentPaper.columnOrder.forEach(function (key, index) {
      var col = lima.columns[key];
      if (col && col.id !== key) {
        currentMetaanalysis.columnOrder[index] = col.id;
      }
    });

    updateMetaanalysisView();
  }





  var paperTitles = [];
  var metaanalysisTitles = [];
  var allTitles = [];
  var titlesNextUpdate = 0;

  // now retrieve the list of all paper titles for checking uniqueness
  function loadAllTitles() {
    var curtime = Date.now();
    if (titlesNextUpdate < curtime) {
      titlesNextUpdate = curtime + 5 * 60 * 1000; // update titles no less than 5 minutes from now
      fetch('/api/papers/titles')
      .then(_.fetchJson)
      .then(function (titles) { paperTitles = titles; })
      .catch(function (err) {
        console.error('problem getting paper titles');
        console.error(err);
      });
      fetch('/api/metaanalyses/titles')
      .then(_.fetchJson)
      .then(function (titles) { metaanalysisTitles = titles; })
      .catch(function (err) {
        console.error('problem getting paper titles');
        console.error(err);
      });
      allTitles = paperTitles.concat(metaanalysisTitles);
    }
  }

  function checkTitleUnique(title) {
    if (title === '') throw null; // no message necessary
    if (title === 'new') throw '"new" is a reserved title';
    if (!title.match(/^[a-zA-Z0-9.-]+$/)) throw 'metaanalysis short name cannot contain spaces or special characters';
    loadAllTitles();
    if (title !== currentPaperOrigTitle && allTitles.indexOf(title) !== -1) {
      // try to give a useful suggestion for common names like Juliet94a
      var match = title.match(/(^[a-zA-Z0-9]*[0-9]+)([a-zA-Z]?)$/);
      if (match) {
        var suggestion = match[1];
        var postfix = 97; // 97 is 'a'; 123 is beyond 'z'
        while (allTitles.indexOf(suggestion+String.fromCharCode(postfix)) > -1 && postfix < 123) postfix++;
        if (postfix < 123) throw 'try ' + suggestion + String.fromCharCode(postfix) + ', "' + title + '" is already used';
      }

      // otherwise just say this
      throw 'metaanalysis "' + title + '" already exists, please try a different short name';
    }
    return title;
  }

})(window, document);
