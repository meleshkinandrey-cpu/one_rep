define(['knockout', 'jquery'], function (ko, $) {
    var module = {
        Grade: function (name, checked) {
            var mself = this;
            //
            mself.Name = name;
            mself.Checked = ko.observable(checked);
            mself.Class = ko.computed(function () {
            	return 'b-requestDetail__grade-smile' + mself.Name + (mself.Checked() ? '-active' : '');
            });
        },
        CreateClassicArray: function(currentChecked)
        {
        	var retval = [];
        	for (var i = 1; i <= 5; i++) {
        		var num = '' + i;
        		retval.push(new module.Grade(num, num == currentChecked));
        	};
			//
        	return retval;
        }
    };
    return module;
});