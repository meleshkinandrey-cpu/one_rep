define(['knockout', 'jquery'], function (ko, $) {
    var module = {
        ViewModel: function (readonly) {
            var self = this;

            var checkStates = {
                checked: 1,
                unchecked: 2,
                partiallyChecked: 3
            };

            function isCheckedState(checkState) { return checkState === checkStates.checked; };
            function isUncheckedState(checkState) { return checkState === checkStates.unchecked; };
            function isPartiallyCheckedState(checkState) { return !isCheckedState(checkState) && !isUncheckedState(checkState); };

            self.readonly = ko.observable(readonly || false);
            var value = ko.observable(checkStates.unchecked);
            self.click = function () {
                if (!self.readonly()) {
                    if (self.isUnchecked()) {
                        self.check();
                    } else {
                        self.uncheck();
                    }
                }
            };

            var handlers = [];
            function raiseValueChanged() {
                ko.utils.arrayForEach(handlers, function (handler) { handler(); });
            };
            self.subscribe = function (handler) {
                handlers.push(handler);
            };

            self.isChecked = ko.pureComputed(function () { return isCheckedState(value()); });
            self.isUnchecked = ko.pureComputed(function () { return isUncheckedState(value()); });
            self.isPartiallyChecked = ko.pureComputed(function () { return isPartiallyCheckedState(value()); });

            self.check = function () {
                var changed = !self.isChecked();
                value(checkStates.checked);

                if (changed) {
                    raiseValueChanged();
                }
            };
            self.uncheck = function () {
                var changed = !self.isUnchecked();
                value(checkStates.unchecked);

                if (changed) {
                    raiseValueChanged();
                }
            };
            self.checkPartially = function () {
                var changed = !self.isPartiallyChecked();

                value(checkStates.partiallyChecked);

                if (changed) {
                    raiseValueChanged();
                }
            };
            self.copyState = function (anotherCheckbox) {
                if (anotherCheckbox.isChecked()) {
                    self.check();
                } else if (anotherCheckbox.isUnchecked()) {
                    self.uncheck();
                } else {
                    self.partiallyCheck();
                }
            };
            self.equalState = function (anotherCheckbox) {
                return self.isChecked() === anotherCheckbox.isChecked()
                    && self.isUnchecked() === anotherCheckbox.isUnchecked()
                    && self.isPartiallyChecked() === anotherCheckbox.isPartiallyChecked();
            };
        }        
    };
    return module;
});