define([], function() {
	var result = {
		value: 0
	}
	function add(num) {
		result.value += num;
	}
	function cut(num) {
		result.value -= num;
	}
	return {
		result: result,
		add: add,
		cut: cut
	}
})