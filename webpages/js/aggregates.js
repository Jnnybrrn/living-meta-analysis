(function (window, document) { // eslint-disable-line no-unused-vars
  'use strict';

  var lima = window.lima;

  lima.listAggregates = function listAggregates() {
    return [
      {
        id: 'mean',
        label: 'Mean',
        func: mean,
      },
      {
        id: 'mode',
        label: 'Mode',
        func: mode,
      },
      {
        id: 'median',
        label: 'Median',
        func: median,
      },
    ];
  }

  function strictToNumber(val) {
    if (typeof val == 'number') return val;
    if (typeof val == 'string') {
      if (val == '') return NaN;
      else return Number(val);
    }
    return NaN;
  }

  lima.getAggregateById = function getAggregateById(id) {
    var aggregates = lima.listAggregates();
    for (var i=0; i<aggregates.length; i++) {
      if (aggregates[i].id === id) return aggregates[i];
    }
    return null;
  }

  // here start the functions implementing the aggregates
  // Key structure to an aggregate function:
  //  - Parameter must be an array
  //  - Loop over that array, and return a single value
  //  - Must gracefully handle wacko figures, including !VALUE and null's.

  function mean (valueArray) {
    // validate the input
    valueArray.forEach(function(value) {
      value = strictToNumber(value);
    })

    // perform the calculation
    // may return NaN or infinities
    var total = 0;
    valueArray.forEach(function(value) {
      total += parseFloat(value);
    })

    return total / valueArray.length;
  }

// With thanks - http://codereview.stackexchange.com/a/68342
  function mode (valueArray) {
    // validate the input
    valueArray.forEach(function(value) {
      value = strictToNumber(value);
    })

    // perform the calculation
    // may return NaN or infinities
    var mode, greatestFreq = 0;
    var mapping = {};

    valueArray.forEach(function(value) {
      mapping[value] = (mapping[value] || 0) + 1;
      if (greatestFreq < mapping[value]) {
        greatestFreq = mapping[value];
        mode = value;
      }
    });

    return mode;
  }

  function median (valueArray) {
    // validate the input
    valueArray.forEach(function(value) {
      value = strictToNumber(value);
    })

    // perform the calculation
    // may return NaN or infinities
    var median = 0;

    if (valueArray.length % 2 == 0) {
      var left, right;
      left = parseFloat(valueArray[parseInt(valueArray.length/2-1)]);
      right = parseFloat(valueArray[parseInt(valueArray.length/2)]);

      median = (left + right) / 2
    } else {
      median = valueArray[parseInt(valueArray.length/2)];
    }

    return median;
  }


})(window, document);
