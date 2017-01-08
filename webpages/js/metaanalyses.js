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
    if (Array.isArray(currentMetaanalysis.columnOrder)) currentMetaanalysis.columnOrder.forEach(function (key, index) {
      var col = lima.columns[key];
      if (col && col.id !== key) {
        currentMetaanalysis.columnOrder[index] = col.id;
      }
    });

    updateMetaanalysisView();
  }

  function updateaMetaanalysisView(metaanalysis) {
    if (!metaanalysis) metaanalysis = currentMetaanalysis;

    if (!(metaanalysis instanceof metaanalysis)) {
      metaanalysis = Object.assign(new Metaanalysis(), metaanalysis);

      // TODO: Initialise more empty "things" here.. e.g. metaanalysis.papers = [];
      if (!Array.isArray(metaanalysis.experiments)) metaanalysis.experiments = [];
      if (!Array.isArray(metaanalysis.columnOrder)) metaanalysis.columnOrder = [];
      if (!Array.isArray(metaanalysis.hiddenCols)) metaanalysis.hiddenCols = [];

      // if some column type has changed, make sure the paper reflects that
      moveResultsAfterCharacteristics(metaanalysis);
    }

    currentMetaanalysis = metaanalysis;

    fillMetaanalysis(metaanalysis);

    // for a new metaanalysis, go to editing the title
    if (!metaanalysis.id) focusFirstValidationError();
  }

  var startNewTag = null;
  var flashTag = null;
  var rebuildingDOM = false;

  function fillMetaanalysis(metaanalysis) {
    // cleanup
    var oldMetaaanalysisEl = _.byId('metaanalysis');
    rebuildingDOM = true;
    if (oldMetaaanalysisEl) oldMetaaanalysisEl.parentElement.removeChild(oldMetaaanalysisEl);
    rebuildingDOM = false;

    resetComputedDataSetters();

    if (!metaanalysis.id) {
      _.addClass('body', 'new');
      lima.toggleEditing(true);
    } else {
      _.removeClass('body', 'new');
    }

    var metaanalysisTemplate = _.byId('metaanalysis-template');
    var metaanalysisEl = _.cloneTemplate(metaanalysisTemplate).children[0];
    metaanalysisTemplate.parentElement.insertBefore(metaanalysisEl, metaanalysisTemplate);

    fillTags(metaanalysisEl, metaanalysis);
    fillMetaanalysisExperimentTable(metaanalysis);

    var ownURL = createPageURL(lima.getAuthenticatedUserEmail(), metaanalysis.title);
    _.setProps(metaanalysisEl, '.edityourcopy a', 'href', ownURL);

    _.fillEls(metaanalysisEl, '.title', metaanalysis.title);
    _.fillEls (metaanalysisEl, '.authors .value', metaanalysis.authors);
    _.fillEls (metaanalysisEl, '.reference .value', metaanalysis.reference);
    _.fillEls (metaanalysisEl, '.description .value', metaanalysis.description);
    _.fillEls (metaanalysisEl, '.link .value', metaanalysis.link);
    _.setProps(metaanalysisEl, '.link a.value', 'href', metaanalysis.link);
    _.fillEls (metaanalysisEl, '.doi .value', metaanalysis.doi);
    _.setProps(metaanalysisEl, '.doi a.value', 'href', function(el){return el.dataset.base + metaanalysis.doi});
    _.fillEls (metaanalysisEl, '.enteredby .value', metaanalysis.enteredBy);
    _.setProps(metaanalysisEl, '.enteredby .value', 'href', '/' + metaanalysis.enteredBy + '/');
    _.fillEls (metaanalysisEl, '.ctime .value', _.formatDateTime(metaanalysis.ctime));
    _.fillEls (metaanalysisEl, '.mtime .value', _.formatDateTime(metaanalysis.mtime));

    _.setDataProps(metaanalysisEl, '.enteredby.needs-owner', 'owner', metaanalysis.enteredBy);

    addConfirmedUpdater('#metaanalysis .link span.editing', '#metaanalysis .link button.confirm', '#metaanalysis .link button.cancel', 'textContent', identity, metaanalysis, 'link');
    addConfirmedUpdater('#metaanalysis .doi span.editing', '#metaanalysis .doi button.confirm', '#metaanalysis .doi button.cancel', 'textContent', stripDOIPrefix, metaanalysis, 'doi');

    // workaround for chrome not focusing right
    // clicking on the placeholder 'doi' of an empty editable doi value focuses the element but doesn't react to subsequent key strokes
    _.addEventListener(metaanalysisEl, '.link .value.editing', 'click', blurAndFocus);
    _.addEventListener(metaanalysisEl, '.doi .value.editing', 'click', blurAndFocus);

    addOnInputUpdater(metaanalysisEl, ".authors .value", 'textContent', identity, metaanalysis, 'authors');
    addOnInputUpdater(metaanalysisEl, ".reference .value", 'textContent', identity, metaanalysis, 'reference');
    addOnInputUpdater(metaanalysisEl, ".description .value", 'textContent', identity, metaanalysis, 'description');

    currentMetaanalysisOrigTitle = metaanalysis.title;
    addConfirmedUpdater('#metaanalysis .title.editing', '#metaanalysis .title + .titlerename', '#metaanalysis .title ~ * .titlerenamecancel', 'textContent', checkTitleUnique, metaanalysis, 'title');

    if (!metaanalysis.tags) metaanalysis.tags = [];

    _.setYouOrName();

    // now that the metaanalysis is all there, install various general and specific event listeners
    _.addEventListener(metaanalysisEl, '[contenteditable].oneline', 'keydown', blurOnEnter);

    _.addEventListener(metaanalysisEl, '.linkedit button.test', 'click', linkEditTest);
    _.addEventListener(metaanalysisEl, '.linkedit button.test', 'mousedown', preventLinkEditBlur);

    _.addEventListener(metaanalysisEl, '[data-focuses]', 'click', focusAnotherElementOnClick);

    _.addEventListener(metaanalysisEl, '.savingerror', 'click', _.manualSave);
    _.addEventListener(metaanalysisEl, '.validationerrormessage', 'click', focusFirstValidationError);
    _.addEventListener(metaanalysisEl, '.unsavedmessage', 'click', focusFirstUnsaved);

    document.addEventListener('keydown', moveBetweenDataCells, true);

    if (pinnedBox) pinPopupBox(pinnedBox);

    setValidationErrorClass();
    setUnsavedClass();

    recalculateComputedData();
  }

  function stripDOIPrefix(doi) {
    if (doi.toLowerCase().startsWith('doi:')) {
      doi = doi.substring(4);
    }
    return doi;
  }


  /* editTags
   *
   *                         #######
   *   ###### #####  # #####    #      ##    ####   ####
   *   #      #    # #   #      #     #  #  #    # #
   *   #####  #    # #   #      #    #    # #       ####
   *   #      #    # #   #      #    ###### #  ###      #
   *   #      #    # #   #      #    #    # #    # #    #
   *   ###### #####  #   #      #    #    #  ####   ####
   *
   *
   */

  function fillTags(metaanalysisEl, metaanalysis) {
    _.fillTags(metaanalysisEl, '.tags', metaanalysis.tags, flashTag); flashTag = null;

    // events for removing a tag
    _.findEls(metaanalysisEl, '.tags .tag + .removetag').forEach(function (btn) {
      btn.onclick = function () {
        // the .tag can be a previous sibling or an ancestor of the button, find it:
        var el = _.findPrecedingEl(btn, '.tag');
        if (el) {
          var text = el.textContent;
          var i = metaanalysis.tags.indexOf(text);
          if (i !== -1) {
            metaanalysis.tags.splice(i, 1);
            fillTags(metaanalysisEl, metaanalysis);
            _.scheduleSave(metaanalysis);
          } else {
            console.error('removing tag but can\'t find it: ' + text);
          }
        }
      }
    })
    // events for starting to add a tag
    var btn = _.findEl(metaanalysisEl, '.tags .new + .addtag');
    var newTagContainer = _.findEl(metaanalysisEl, '.tags .new');
    var newTag = _.findEl(metaanalysisEl, '.tags .new .tag');

    btn.onclick = function () {
      newTagContainer.classList.add('editing');
      newTag.focus();
    }
    if (startNewTag != null) {
      btn.onclick();
      newTag.textContent = startNewTag;

      if (startNewTag != '') {
        // put cursor at the end of the text
        // todo we could remember the old selection and replicate it
        _.putCursorAtEnd(newTag);
      }

      startNewTag = null;
    }

    // events for adding a tag
    newTag.onblur = function () {
      if (rebuildingDOM) {
        // the blur has happened because a DOM rebuild (e.g. after save) is destroying the element we were editing
        startNewTag = newTag.textContent;
      } else {
        var text = newTag.textContent.trim();
        if (!text) {
          newTagContainer.classList.remove('editing');
        } else {
          if (metaanalysis.tags.indexOf(text) === -1) {
            metaanalysis.tags.push(text);
            _.scheduleSave(metaanalysis);
          }
          flashTag = text;
          fillTags(metaanalysisEl, metaanalysis);
        }
      }
    }
    newTag.onkeydown = function (ev) {
      _.deferScheduledSave();
      // enter
      if (ev.keyCode === 13 && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        startNewTag = null;
        ev.preventDefault();
        newTag.blur();
      }
      // escape
      else if (ev.keyCode === 27) {
        startNewTag = null;
        newTagContainer.classList.remove('editing');
        newTag.textContent = '';
      }
      // tab or comma starts a new tag
      else if ((ev.keyCode === 9 || ev.keyCode === 188) && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        ev.preventDefault();
        if (newTag.textContent.trim()) {
          startNewTag = '';
          newTag.blur();
        }
      }
    }
  }

  /* fill Exp table
   *
   *                             #######
   *   ###### # #      #         #       #    # #####     #####   ##   #####  #      ######
   *   #      # #      #         #        #  #  #    #      #    #  #  #    # #      #
   *   #####  # #      #         #####     ##   #    #      #   #    # #####  #      #####
   *   #      # #      #         #         ##   #####       #   ###### #    # #      #
   *   #      # #      #         #        #  #  #           #   #    # #    # #      #
   *   #      # ###### ######    ####### #    # #           #   #    # #####  ###### ######
   *
   *
   */
  function fillMetaanalysisExperimentTable(metaanalysis) {
    var experiments = metaanalysis.experiments;

    // hide the empty experiment data table if the user can't edit it
    if (!experiments.length) {
      _.addClass('#metaanalysis', 'no-data');
    }

    var table = _.cloneTemplate('experiments-table-template');

    /* column headings
     *
     *
     *    ####   ####  #      #    # #    # #    #    #    # ######   ##   #####  # #    #  ####   ####
     *   #    # #    # #      #    # ##  ## ##   #    #    # #       #  #  #    # # ##   # #    # #
     *   #      #    # #      #    # # ## # # #  #    ###### #####  #    # #    # # # #  # #       ####
     *   #      #    # #      #    # #    # #  # #    #    # #      ###### #    # # #  # # #  ###      #
     *   #    # #    # #      #    # #    # #   ##    #    # #      #    # #    # # #   ## #    # #    #
     *    ####   ####  ######  ####  #    # #    #    #    # ###### #    # #####  # #    #  ####   ####
     *
     *
     */

    var headingsRowNode = _.findEl(table, 'tr:first-child');
    var addColumnNode = _.findEl(table, 'tr:first-child > th.add');

    var curtime = Date.now();
    var user = lima.getAuthenticatedUserEmail();

    var lastColumnHidden = false;

    metaanalysis.columnOrder.forEach(function (colId) {
      if (isHiddenCol(colId)) {
        // Save the fact that we just hid a column, so the next non-hidden
        // column can behave differently (i.e show a arrow).
        lastColumnHidden = true;
        return;
      }

      var col = lima.columns[colId];
      var th = _.cloneTemplate('col-heading-template').children[0];
      headingsRowNode.insertBefore(th, addColumnNode);

      if (lastColumnHidden) {
        // We know that there should be an "unhide" button on this column
        addUnhideButton(th);
        lastColumnHidden = false;
      }

      _.fillEls(th, '.coltitle', col.title);
      _.fillEls(th, '.coldescription', col.description);
      _.fillEls(th, '.colctime .value', _.formatDateTime(col.ctime || curtime));
      _.fillEls(th, '.colmtime .value', _.formatDateTime(col.mtime || curtime));
      _.fillEls(th, '.definedby .value', col.definedBy || user);
      _.setProps(th, '.definedby .value', 'href', '/' + (col.definedBy || user) + '/');

      _.addEventListener(th, 'button.move', 'click', moveColumn);

      th.dataset.colid = col.id;

      _.addEventListener(th, 'button.hide', 'click', function () {
        metaanalysis.hiddenCols.push(th.dataset.colid);
        unpinPopupBox();
        updateMetaanalysisView();
        _.scheduleSave(currentMetaanalysis);
      });

      th.classList.add(col.type);
      _.addClass(th, '.coltype', col.type);

      if (col.new) {
        th.classList.add('newcol');
        _.addClass(th, '.coltype', 'newcol');
        _.addClass(th, '.coltitle.editing', 'new');
        // todo move the confirm/rename difference into html, but that means we have multiple confirm buttons and addConfirmedUpdater might be unhappy
        _.fillEls(th, '.coltitle + .coltitlerename', 'confirm');
      }

      addOnInputUpdater(th, '.coldescription', 'textContent', identity, col, ['description']);

      addConfirmedUpdater(th, '.coltitle.editing', '.coltitle ~ .coltitlerename', '.coltitle ~ * .colrenamecancel', 'textContent', checkColTitle, col, 'title', deleteNewColumn, function(){_.scheduleSave(paper);});

      setupPopupBoxPinning(th, '.fullcolinfo.popupbox', col.id);

      _.addEventListener(th, '.coltype .switch', 'click', changeColumnType);
      _.addEventListener(th, '.coltypeconfirm button', 'click', changeColumnTypeConfirmOrCancel);

      // Computed columns
      var computedColumnsOptionsEl = _.findEl(th, '.colcomputedcolumns');
      if (col.formula) {
        // If we have anything re. computed columns, show the further options
        _.setProps(th, '.colcomputed', 'checked', 1);
        computedColumnsOptionsEl.classList.remove('option-not-checked');
      }

      _.addEventListener(th, '.colcomputed', 'click', function (e) {
        var checked = e.target.checked;
        if (checked) {
          computedColumnsOptionsEl.classList.remove('option-not-checked');
        } else {
          computedColumnsOptionsEl.classList.add('option-not-checked');
        }
      });

      // fill in the current formula
      var formula = lima.getFormulaById(col.formula);
      _.fillEls(computedColumnsOptionsEl, '.colformula', formula ? formula.label : 'error'); // the 'error' string should not be visible

      // Add an option for every formula we know
      var formulas = lima.listFormulas();
      var formulasDropdown = _.findEl(th, 'select.colformulas')
      for (var i = 0; i < formulas.length; i++){
        var el = document.createElement("option");
        el.textContent = formulas[i].label;
        el.value = formulas[i].id;
        if (col.formula === el.value) el.selected = true;
        formulasDropdown.appendChild(el);
      }

      // react to changes in the selection of formula
      formulasDropdown.onchange = function(e) {
        col.formula = e.target.value;

        var formula = lima.getFormulaById(col.formula);

        // make sure formula columns array matches the number of expected parameters
        if (!Array.isArray(col.formulaColumns)) col.formulaColumns = [];
        col.formulaColumns.length = formula ? formula.parameters.length : 0;

        // fill in the current formula
        _.fillEls(computedColumnsOptionsEl, '.colformula', formula ? formula.label : 'error'); // the 'error' string should not be visible

        // fill the columns selection
        fillFormulaColumnsSelection(metaanalysis, col, computedColumnsOptionsEl, formula);

        _.scheduleSave(col);
        recalculateComputedData();
      };

      // if we already have a formula, fill the columns selection
      fillFormulaColumnsSelection(metaanalysis, col, computedColumnsOptionsEl, formula);

      _.setDataProps(th, '.needs-owner', 'owner', col.definedBy || user);
    });

    // Check to see if the last column was hidden.
    if (lastColumnHidden) {
      addUnhideButton(addColumnNode);
      lastColumnHidden = false;
    }


    /* experiment rows
     *
     *
     *   ###### #    # #####  ###### #####  # #    # ###### #    # #####    #####   ####  #    #  ####
     *   #       #  #  #    # #      #    # # ##  ## #      ##   #   #      #    # #    # #    # #
     *   #####    ##   #    # #####  #    # # # ## # #####  # #  #   #      #    # #    # #    #  ####
     *   #        ##   #####  #      #####  # #    # #      #  # #   #      #####  #    # # ## #      #
     *   #       #  #  #      #      #   #  # #    # #      #   ##   #      #   #  #    # ##  ## #    #
     *   ###### #    # #      ###### #    # # #    # ###### #    #   #      #    #  ####  #    #  ####
     *
     *
     */

    // fill rows with experiment data
    var tableBodyNode = _.findEl(table, 'tbody');
    var addRowNode = _.findEl(table, 'tbody > tr.add');

    experiments.forEach(function (experiment, expIndex) {
      var tr = _.cloneTemplate('experiment-row-template').children[0];
      tableBodyNode.insertBefore(tr, addRowNode);

      _.fillEls(tr, '.exptitle', experiment.title);
      _.fillEls(tr, '.expdescription', experiment.description);

      if (!experiment.title) {
        _.addClass(tr, '.exptitle.editing', 'new');
        _.fillEls(tr, '.exptitle + .exptitlerename', 'confirm');
      } else {
        _.fillEls(tr, '.exptitle + .exptitlerename', 'rename');
      }

      addOnInputUpdater(tr, ".expdescription.editing", 'textContent', identity, metaanalysis, ['experiments', expIndex, 'description']);

      _.setDataProps(tr, '.exptitle.editing', 'origTitle', experiment.title);
      addConfirmedUpdater(tr, '.exptitle.editing', '.exptitle + .exptitlerename', null, 'textContent', checkExperimentTitleUnique, metaanalysis, ['experiments', expIndex, 'title'], deleteNewExperiment);

      setupPopupBoxPinning(tr, '.fullrowinfo.popupbox', expIndex);

      paper.columnOrder.forEach(function (colId) {
        // early return - ignore this column
        if (isHiddenCol(colId)) return;

        var col = lima.columns[colId];
        var val = null;
        var td = _.cloneTemplate('experiment-datum-template').children[0];
        tr.appendChild(td);

        if (!col.formula) {
          // not a computed column
          if (experiment.data && experiment.data[colId]) {
            val = experiment.data[colId];
          }

          if (!val || val.value == null) {
            td.classList.add('empty');
          } else {
            _.fillEls(td, '.value', val.value);
          }

          addOnInputUpdater(td, '.value', 'textContent', identity, metaanalysis, ['experiments', expIndex, 'data', colId, 'value'], recalculateComputedData);

          var user = lima.getAuthenticatedUserEmail();
          _.fillEls (td, '.valenteredby', val && val.enteredBy || user);
          _.setProps(td, '.valenteredby', 'href', '/' + (val && val.enteredBy || user) + '/');
          _.fillEls (td, '.valctime', _.formatDateTime(val && val.ctime || Date.now()));

        } else {
          // computed column
          td.classList.add('computed');
          // todo computed from x and y

          addComputedDatumSetter(function() {
            var val = getDatumValue(colId, expIndex);

            // handle bad values like Excel
            if (val == null) {
              val = '';
              td.classList.add('empty');
            } else if (typeof val == 'number' && isNaN(val)) {
              val = '#VALUE!';
              td.classList.add('empty');
            } else {
              td.classList.remove('empty');
            }

            // only show three significant digits for numbers
            if (typeof val == 'number') val = val.toPrecision(3);

            _.fillEls(td, '.value', val);
          });
        }

        td.classList.add(col.type);

        if (col.new) {
          td.classList.add('newcol');
        }

        setupPopupBoxPinning(td, '.datum.popupbox', expIndex + '$' + colId);

        // populate comments
        fillComments('comment-template', td, '.commentcount', '.datum.popupbox main', metaanalysis, ['experiments', expIndex, 'data', colId, 'comments']);
      });
    });

    _.addEventListener(table, 'tr.add button.add', 'click', addExperimentRow);

    _.addEventListener(table, 'th.add button.add', 'click', addExperimentColumn);
    _.addEventListener(table, 'th.add button.cancel', 'click', dismissAddExperimentColumn);
    _.addEventListener(table, 'th.add button.addnew', 'click', addNewExperimentColumn);

    var experimentsContainer = _.findEl('#metaanalysis .experiments');
    experimentsContainer.appendChild(table);
  }

  function fillFormulaColumnsSelection(metaanalysis, col, computedColumnsOptionsEl, formula) {

    // editing drop-down boxes for parameter columns
    var formulaColumnsSelectionEl = _.findEl(computedColumnsOptionsEl, '.colformulacolumnsselection');
    // clear out old children.
    formulaColumnsSelectionEl.innerHTML = '';

    // non-editing information about parameter columns
    var formulaColumnsInfoEl = _.findEl(computedColumnsOptionsEl, '.colformulacolumns');
    // clear out old children.
    formulaColumnsInfoEl.innerHTML = '';


    if (!formula) return;

    var noOfParams = formula.parameters.length;

    for (var i = 0; i < noOfParams; i++){
      // Make a select dropdown
      var label = document.createElement('label');
      label.textContent = formula.parameters[i] + ': ';
      formulaColumnsSelectionEl.appendChild(label);

      var select = document.createElement("select");
      label.appendChild(select);

      // listen to changes of the dropdown box
      // preserve the value of i inside this code
      (function(i){
        select.onchange = function(e) {
          col.formulaColumns[i] = e.target.value;
          _.scheduleSave(col);
          recalculateComputedData();
        };
      })(i);

      // the first option is an instruction
      var op = document.createElement("option");
      op.textContent = 'Select a column';
      op.value = '';
      select.appendChild(op);

      // Now make an option for each column in paper
      for (var j = 0; j < metaanalysis.columnOrder.length; j++){
        var colId = metaanalysis.columnOrder[j];

        // the current computed column should not be an option here
        if (colId === col.id) continue;

        var el = document.createElement("option");
        el.textContent = lima.columns[colId].title;
        el.value = colId;
        if (col.formulaColumns[i] === el.value) {
          el.selected = true;
        }
        select.appendChild(el);
      }
    }

    for (i = 0; i < noOfParams; i++){
      // show the parameter in a paragraph
      var paramEl = document.createElement('p');
      paramEl.textContent = formula.parameters[i] + ': ';
      formulaColumnsInfoEl.appendChild(paramEl);

      var paramCol = lima.columns[col.formulaColumns[i]];
      var colTitleEl = document.createElement('span');
      colTitleEl.textContent = paramCol ? paramCol.title : 'unspecified';
      if (!paramCol) colTitleEl.classList.add('unspecified');
      paramEl.appendChild(colTitleEl);
    }
  }

  /* computed cols
   *
   *
   *    ####   ####  #    # #####  #    # ##### ###### #####      ####   ####  #       ####
   *   #    # #    # ##  ## #    # #    #   #   #      #    #    #    # #    # #      #
   *   #      #    # # ## # #    # #    #   #   #####  #    #    #      #    # #       ####
   *   #      #    # #    # #####  #    #   #   #      #    #    #      #    # #           #
   *   #    # #    # #    # #      #    #   #   #      #    #    #    # #    # #      #    #
   *    ####   ####  #    # #       ####    #   ###### #####      ####   ####  ######  ####
   *
   *
   */
  var computedDataSetters;
  var computedDataCache = {};
  var CIRCULAR_COMPUTATION_FLAG = {message: 'uncaught circular computation!'};

  function resetComputedDataSetters() {
    computedDataSetters = [];
  }

  // when building the dom, we save a list of functions that update every given computed cell
  function addComputedDatumSetter(f) {
    computedDataSetters.push(f);
  }

  function recalculateComputedData() {
    // clear computation cache
    computedDataCache = {};
    // call all the calculation functions
    computedDataSetters.forEach(function (f) { f(); });
  }

  function getDatumValue(colId, expIndex) {
    // check cache
    if (!(colId in computedDataCache)) computedDataCache[colId] = [];
    if (expIndex in computedDataCache[colId]) {
      if (computedDataCache[colId][expIndex] === CIRCULAR_COMPUTATION_FLAG) {
        throw new Error('circular computation involving col ' + colId);
      }
      return computedDataCache[colId][expIndex];
    }

    computedDataCache[colId][expIndex] = CIRCULAR_COMPUTATION_FLAG;

    var col = lima.columns[colId];
    var val = null;
    if (!col.formula) {
      // not a computed column
      if (currentMetaanalysis.experiments[expIndex] &&
          currentMetaanalysis.experiments[expIndex].data &&
          currentMetaanalysis.experiments[expIndex].data[colId] &&
          currentMetaanalysis.experiments[expIndex].data[colId].value != null) {
        val = currentMetaanalysis.experiments[expIndex].data[colId].value;
      }
    } else {
      // computed column
      var inputs = [];
      var formula = lima.getFormulaById(col.formula);
      var columnNotCompletelyDefined = false;

      // compute the value
      // if anything here throws an exception, value cannot be computed
      for (var i=0; i<col.formulaColumns.length; i++) {
        if (!(col.formulaColumns[i] in lima.columns)) {
          // the computed column's input columns are not all defined
          columnNotCompletelyDefined = true;
          break;
        }
        inputs.push(getDatumValue(col.formulaColumns[i], expIndex));
      }

      if (!columnNotCompletelyDefined) val = formula.func.apply(null, inputs);

      // if the result is NaN but some of the inputs were empty, change the result to empty.
      if (typeof val == 'number' && isNaN(val)) {
        if (inputs.some(function (x) { return x == null || x === ''; })) val = null;
      }
    }

    computedDataCache[colId][expIndex] = val;
    return val;
  }

  /* adding cols
   *
   *
   *     ##   #####  #####  # #    #  ####      ####   ####  #       ####
   *    #  #  #    # #    # # ##   # #    #    #    # #    # #      #
   *   #    # #    # #    # # # #  # #         #      #    # #       ####
   *   ###### #    # #    # # #  # # #  ###    #      #    # #           #
   *   #    # #    # #    # # #   ## #    #    #    # #    # #      #    #
   *   #    # #####  #####  # #    #  ####      ####   ####  ######  ####
   *
   *
   */

  function addExperimentColumn() {
    // if there are no pending changes and if the paper has any data, add a new column to the paper
    if (lima.checkToPreventForcedSaving()) {
      console.warn('cannot add a column with some edited values pending');
      return;
    }

    if (!Array.isArray(currentMetaanalysis.experiments) || currentMetaanalysis.experiments.length < 1) {
      console.warn('cannot add a column when the metaanalysis has no data');
      return;
    }

    // show the add column box
    _.addClass('#metaanalysis table.experiments tr:first-child th.add', 'adding');
    _.addClass('body', 'addnewcolumn');

    lima.getColumns()
    .then(populateAddColumnsList);
  }

  function dismissAddExperimentColumn() {
    _.removeClass('#metaanalysis table.experiments tr:first-child th.add', 'adding');
    _.removeClass('body', 'addnewcolumn');
  }

  function populateAddColumnsList(columns) {
    var list = _.findEl('#metaanalysis table.experiments tr:first-child th.add .addcolumnbox > ul');
    list.innerHTML='';
    var user = lima.getAuthenticatedUserEmail();
    var ordered = {yours: { result: [], characteristic: []},
                   other: { result: [], characteristic: []},
                   already: { result: [], characteristic: []}};
    Object.keys(columns).forEach(function(colId) {
      var col = columns[colId];
      var bucket = (col.definedBy === user || !col.definedBy) ? 'yours' : 'other';
      if (currentMetaanalysis.columnOrder.indexOf(colId) > -1) bucket = 'already';
      ordered[bucket][col.type].push(col);
    })
    ordered.yours.result.sort(compareColumnsByAuthorAndTitle);
    ordered.yours.characteristic.sort(compareColumnsByAuthorAndTitle);
    ordered.other.result.sort(compareColumnsByAuthorAndTitle);
    ordered.other.characteristic.sort(compareColumnsByAuthorAndTitle);
    ordered.already.result.sort(compareColumnsByAuthorAndTitle);
    ordered.already.characteristic.sort(compareColumnsByAuthorAndTitle);
    // todo add collapsing of these blocks on clicking the header
    addColumnsBlock(list, 'your characteristic/moderator columns:', ordered.yours.characteristic);
    addColumnsBlock(list, 'your result columns:', ordered.yours.result);
    addColumnsBlock(list, 'characteristic/moderator columns:', ordered.other.characteristic);
    addColumnsBlock(list, 'result columns:', ordered.other.result);
    addColumnsBlock(list, 'columns used in the meta-analysis:', ordered.already.characteristic.concat(ordered.already.result));
    _.removeClass('#metaanalysis table.experiments tr:first-child th.add .addcolumnbox.loading', 'loading');
    _.setYouOrName();

    emptyColInfo();
    pinPopupBox('colinfo');
  }

  function compareColumnsByAuthorAndTitle(a, b) {
    if (a.definedBy < b.definedBy) return -1;
    if (a.definedBy > b.definedBy) return 1;
    if (a.title < b.title) return -1;
    if (a.title > b.title) return 1;
    return 0;
  }

  function addColumnsBlock(list, headingText, columns) {
    var user = lima.getAuthenticatedUserEmail();
    if (!columns.length) return; // do nothing if we have no columns in the block
    var heading = document.createElement('li');
    heading.classList.add('heading');
    heading.textContent = headingText;
    list.appendChild(heading);
    columns.forEach(function (col) {
      var li = _.cloneTemplate('column-list-item-template').children[0];
      _.fillEls(li, '.coltitle', col.title);
      _.fillEls(li, '.definedby .value', col.definedBy || user);
      _.setProps(li, '.definedby .value', 'href', '/' + (col.definedBy || user) + '/');
      _.setDataProps(li, '.needs-owner', 'owner', col.definedBy || user);
      li.dataset.colid = col.id;

      if (currentPaper.columnOrder.indexOf(col.id) > -1) {
        li.classList.add('alreadythere');
      }

      li.addEventListener('mouseenter', fillColInfo);
      _.addEventListener(li, '.coltitle', 'click', selectNewColumn);
      list.addEventListener('mouseleave', emptyColInfo);

      list.appendChild(li);
    })
  }

  function fillColInfo(ev) {
    var col = lima.columns[ev.target.dataset.colid];
    if (!col) {
      console.warn('fillColInfo on element that doesn\'t have a valid column ID: ' + ev.target.dataset.colid);
      return;
    }
    _.fillEls('#metaanalysis th.add .colinfo .coltitle', col.title);
    _.fillEls('#metaanalysis th.add .colinfo .coldescription', col.description);
    _.fillEls('#metaanalysis th.add .colinfo .colctime .value', _.formatDateTime(col.ctime));
    _.fillEls('#metaanalysis th.add .colinfo .colmtime .value', _.formatDateTime(col.mtime));
    _.fillEls('#metaanalysis th.add .colinfo .definedby .value', col.definedBy);
    _.setProps('#metaanalysis th.add .colinfo .definedby .value', 'href', '/' + col.definedBy + '/');
    _.setDataProps('#metaanalysis th.add .colinfo .needs-owner', 'owner', col.definedBy);

    lima.columnTypes.forEach(function (type) {
      _.removeClass('#metaanalysis th.add .colinfo .coltype', type);
    });
    _.addClass('#metaanalysis th.add .colinfo .coltype', col.type);

    _.removeClass('#metaanalysis th.add .colinfo', 'unpopulated');

    if (currentPaper.columnOrder.indexOf(col.id) > -1) {
      _.addClass('#metaanalysis th.add .colinfo', 'alreadythere');
    } else {
      _.removeClass('#metaanalysis th.add .colinfo', 'alreadythere');
    }

    // Computed columns
    // If we have anything re. computed columns, show the further options
    var compColDetailsEl = _.findEl('#metaanalysis th.add .colinfo .colcomputedcolumns');
    if (col.formula) {
      var formula = lima.getFormulaById(col.formula);
      compColDetailsEl.classList.remove('option-not-checked');
      _.fillEls(compColDetailsEl, '.colformula', formula.label);

      var formulaColumnsInfoEl = _.findEl(compColDetailsEl, '.colformulacolumns');
      // clear out old children.
      formulaColumnsInfoEl.innerHTML = '';

      var noOfParams = formula.parameters.length;

      for (var i = 0; i < noOfParams; i++){
        // show the parameter in a paragraph
        var paramEl = document.createElement('p');
        paramEl.textContent = formula.parameters[i] + ': ';
        formulaColumnsInfoEl.appendChild(paramEl);

        var paramCol = lima.columns[col.formulaColumns[i]];
        var colTitleEl = document.createElement('span');
        colTitleEl.textContent = paramCol ? paramCol.title : 'unspecified';
        if (!paramCol) colTitleEl.classList.add('unspecified');
        paramEl.appendChild(colTitleEl);
      }

    } else {
      compColDetailsEl.classList.add('option-not-checked');
    }

    _.setYouOrName();
  }

  function emptyColInfo() {
    _.addClass('#metaanalysis th.add .colinfo', 'unpopulated');
  }

  function selectNewColumn(ev) {
    var el = ev.target;
    while (el && !el.dataset.colid) el = el.parentElement;
    var col = lima.columns[el.dataset.colid];
    if (!col) {
      console.warn('selectNewColumn on element that doesn\'t have a valid column ID: ' + ev.target.dataset.colid);
      return;
    }
    if (currentMetaanalysis.columnOrder.indexOf(col.id) > -1) return; // do nothing on columns that are already there
    // todo this will change when un-hiding a column

    currentMetaanalysis.columnOrder.push(col.id);
    moveResultsAfterCharacteristics(currentMetaanalysis);
    updateMetaanalysisView();
    _.scheduleSave(currentMetaanalysis);

    // the click will popup the wrong box, so delay popping up the right one until after the click is fully handled
    setTimeout(pinPopupBox, 0, 'fullcolinfo@' + el.dataset.colid);
  }

  function addNewExperimentColumn() {
    dismissAddExperimentColumn();
    var col = lima.newColumn();
    currentMetaanalysis.columnOrder.push(col.id);
    moveResultsAfterCharacteristics(currentMetaanalysis);
    updateMetaanalysisView();
    setTimeout(focusFirstValidationError, 0);
  }

  function deleteNewColumn() {
    unpinPopupBox();
    for (var i = 0; i < currentMetaanalysis.columnOrder.length; i++) {
      var colId = currentMetaanalysis.columnOrder[i];
      var col = lima.columns[colId];
      if (col.new && !col.title) {
        currentMetaanalysis.columnOrder.splice(i, 1);
        moveResultsAfterCharacteristics(currentMetaanalysis);
        break;
      }
    }
    updateMetaanalysisView();
    setTimeout(focusFirstValidationError, 0);
  }

  /* adding rows
   *
   *
   *     ##   #####  #####  # #    #  ####     #####   ####  #    #  ####
   *    #  #  #    # #    # # ##   # #    #    #    # #    # #    # #
   *   #    # #    # #    # # # #  # #         #    # #    # #    #  ####
   *   ###### #    # #    # # #  # # #  ###    #####  #    # # ## #      #
   *   #    # #    # #    # # #   ## #    #    #   #  #    # ##  ## #    #
   *   #    # #####  #####  # #    #  ####     #    #  ####  #    #  ####
   *
   *
   */

  function addExperimentRow() {
    // if there are no pending changes, add a new experiment
    if (!lima.checkToPreventForcedSaving()) {
      if (!Array.isArray(currentMetaanalysis.experiments)) currentMetaanalysis.experiments = [];
      currentMetaanalysis.experiments.push({});
      updateMetaanalysisView();
      // focus the empty title of the new experiment
      focusFirstValidationError();
    } else {
      console.warn('cannot add a row with some edited values pending');
    }
  }

  function deleteNewExperiment() {
    if (!lima.checkToPreventForcedSaving()) {
      if (!Array.isArray(currentMetaanalysis.experiments)) return;
      var lastExp = currentMetaanalysis.experiments[currentMetaanalysis.experiments.length - 1];
      if (lastExp && Object.keys(lastExp).length === 0) {
        currentMetaanalysis.experiments.pop();
      }
      unpinPopupBox();
      updateMetaanalysisView();
      focusFirstValidationError();
    }
  }

/////////////////////////////////



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
    if (title !== currentMetaanalysisOrigTitle && allTitles.indexOf(title) !== -1) {
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
