(function (window, document) {
	'use strict';

	var lima = window.lima;
	var _ = lima._;

	lima.listFormulas = function listFormulas() {
		// hash of name: function for available formulas
		// this may be a more complex object if we ever wish to have
		// stuff such as description, formula.. etc displayed.

		return [ {
			label: 'Odds Ratio',
			func: 'oddsRatio', // we can introspect for the number of parameters
		}];
	}

	function number(val) {
	  if (val === undefined || val === null) return false;

	  if (typeof val === 'object' || typeof val === 'function' || isNaN(val)) {
	    console.error(`not a number: ${val}`);
	    console.error(new Error());
	    return false;
	  }

	  return true;
	};

// Work under the assumption all formulas take two values as their parameter.

	lima.oddsRatio = function oddsRatio (value1, value2) {
		// validate the input
		if (number(value1) && number(value2)) {
			var returnValue;
			// perform the calculation
			try {
				returnValue = Math.log((value2/(1-value2))/(value1/(1-value1)));
			}
			catch (err) {
				// unhappy with the result, return null
				console.log(err);
				return null;
			}
			// return
			return returnValue;
		}
		else {
			// input must be bad. TODO: Return diff error?
			console.log('Value 1 = ' + value1);
			console.log('Value 2 = ' + value2);
			return null;
		}
	}
})(window, document);
