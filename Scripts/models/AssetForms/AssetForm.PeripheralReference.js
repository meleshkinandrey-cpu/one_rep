define(['knockout', 'jquery', 'ttControl', 'iconHelper'], function (ko, $, tclib, ihLib) {
    var module = {
        PeripheralReference: function (imList, obj) {
            var self = this;
            //
            self.ID = obj.ID;
            self.TypeName = ko.observable(obj.TypeName);
            self.ModelName = ko.observable(obj.ModelName);
            self.SerialNumber = ko.observable(obj.SerialNumber);
            self.InvNumber = ko.observable(obj.InvNumber);
            self.Code = ko.observable(obj.Code);
            self.AccessIsGranted = ko.observable(obj.AccessIsGranted);
            //
            self.PeripheralList = ko.observableArray([]);
            //            
            if (obj.PeripheralList != null) {
                ko.utils.arrayForEach(obj.PeripheralList, function (el) {
                    self.PeripheralList.push(new module.Peripheral(el));
                });
                //
                self.PeripheralList.valueHasMutated();
            }
            //
            self.Selected = ko.observable(false);
            self.Selected.subscribe(function (newValue) {
                if (newValue)
                    imList.ItemChecked(self);
                else
                    imList.ItemUnchecked(self);
            });
            //
            self.CssIconClass = ko.computed(function () {
                return null;
            });
            //
            self.ExpandCollapseClick = function () {
                self.IsExpanded(!self.IsExpanded());
            };
            self.IsExpanded = ko.observable(false);
            self.ExpandButtonText = ko.computed(function () {
                if (self.IsExpanded())
                    return getTextResource('HideDetails');
                else return getTextResource('ShowDetails');
            });
            self.StateImgClass = ko.computed(function () {
                return 'negotiation-status-icon-endno';
            });
            //
            //
            self.Merge = function (obj) {
                self.TypeName(obj.TypeName);
                self.ModelName(obj.ModelName);
                self.SerialNumber(obj.SerialNumber);
                self.InvNumber(obj.InvNumber);
                self.Code(obj.Code);
                self.AccessIsGranted(obj.AccessIsGranted);
            };
        }
    };
    return module;
});