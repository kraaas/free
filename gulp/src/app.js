define([
	'./assets/lib/dom.js', 
	'./calculator/calculator.js'
], function($, calculator) {
	var calcWrap = document.querySelector('#calc_wrap');
	var view = document.querySelector('#view');

	render();

	function render() {
		view.value = calculator.result.value;
	}

	$.addEvent('click', calcWrap, function(e) {
		var id = e.target.id;
		switch(id) {
			case 'add': 
				calculator.add(1);
				render();
				break;
			case 'cut':
				calculator.cut(1);
				render();
				break;
		}
	})
})