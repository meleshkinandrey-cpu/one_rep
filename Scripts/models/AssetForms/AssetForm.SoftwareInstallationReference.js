define(['knockout', 'jquery', 'ttControl', 'iconHelper'], function (ko, $, tclib, ihLib) {
    var module = {
        SoftwareInstallationReference: function (imList, obj) {
            var nself = this;
            //
            nself.ID = obj.ID;
            nself.Identifier = obj.Identifier;
            nself.TypeName = ko.observable(obj.TypeName);
            //
            nself.SoftwareInstallationList = ko.observableArray([]);
            //            
            if (obj.SoftwareInstallationList != null) {
                ko.utils.arrayForEach(obj.SoftwareInstallationList, function (el) {
                    nself.SoftwareInstallationList.push(new module.SoftwareInstallation(el));
                });
                //
                nself.SoftwareInstallationList.valueHasMutated();
            }
            //
            nself.Selected = ko.observable(false);
            nself.Selected.subscribe(function (newValue) {
                if (newValue)
                    imList.ItemChecked(nself);
                else
                    imList.ItemUnchecked(nself);
            });
            //
            nself.CssIconClass = ko.computed(function () {
                return null;
            });
            //
            nself.ExpandCollapseClick = function () {
                nself.IsExpanded(!nself.IsExpanded());
            };
            nself.IsExpanded = ko.observable(false);
            nself.ExpandButtonText = ko.computed(function () {
                if (nself.IsExpanded())
                    return getTextResource('HideDetails');
                else return getTextResource('ShowDetails');
            });
            nself.StateImgClass = ko.computed(function () {
                return 'negotiation-status-icon-endno';
            });
            //
        },
        SoftwareInstallation: function (obj) {
            var uself = this;
            var nself = parent;
            uself.Name = obj.Name;
        }
    };
    return module;
});