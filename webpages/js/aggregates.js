(function (window, document) { // eslint-disable-line no-unused-vars
  'use strict';

  var lima = window.lima;
  var _ = lima._;

  lima.listAggregates = function listAggregates() {
    return [
      {
        id: 'mean',
        label: 'Mean',
        func: mean,
        parameters: ['values']
      },
      {
        id: 'mode',
        label: 'Mode',
        func: mode,
        parameters: ['values']
      },
      {
        id: 'median',
        label: 'Median',
        func: median,
        parameters: ['values']
      },
      {
        id: 'sum',
        label: 'Sum',
        func: sum,
        parameters: ['values']
      },
      {
        id: 'sumproduct',
        label: 'Sum of Product',
        func: sumproduct,
        parameters: ['values1', 'values2'] // There might be more appropriate names for these. Factor1/2?
      },
    ];
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
      value = _.strictToNumber(value);
    })

    // perform the calculation
    // may return NaN or infinities
    var total = 0;
    valueArray.forEach(function(value) {
      total += parseFloat(value);
    })

    return sum(valueArray) / valueArray.length;
  }

// With thanks - http://codereview.stackexchange.com/a/68342
  function mode (valueArray) {
    // validate the input
    valueArray.forEach(function(value) {
      value = _.strictToNumber(value);
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
      value = _.strictToNumber(value);
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

  function sum (valueArray) {
    // validate the input
    valueArray.forEach(function(value) {
      value = _.strictToNumber(value);
    })

    // perform the calculation
    // may return NaN or infinities
    var total = 0;
    valueArray.forEach(function(value) {
      total += parseFloat(value);
    })

    return total;
  }

  // TODO: Depending on implementation further in the future, this may require extra
  // validation, to be sure we are given correct Arrays.
  function sumproduct (valueArray1, valueArray2) {
    // validate the input
    if (!Array.isArray(valueArray1)) return sum(valueArray2);
    if (!Array.isArray(valueArray2)) return sum(valueArray1);

    valueArray1.forEach(function(value) {
      value = _.strictToNumber(value);
    })
    valueArray2.forEach(function(value) {
      value = _.strictToNumber(value);
    })

    // perform the calculation
    // may return NaN or infinities
    var total = 0;

    for (var i=0; i<valueArray1.length; i++) {
      var value1 = (valueArray1[i]) ? valueArray1[i] : 0;
      var value2 = (valueArray2[i]) ? valueArray2[i] : 0;
      total += value1 * value2;
    }

    return total;
  }

})(window, document);
