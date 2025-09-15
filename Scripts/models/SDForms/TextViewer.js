define(['knockout'], function (ko) {
    var module = {
        ViewModel: function () {
            var self = this;
            //
            self.text = ko.observable();
            self.isHTML = ko.observable(false);
            //
            self.SetText = function (text) {
                self.text(text);
            };
        }
    }
    return module;
});
