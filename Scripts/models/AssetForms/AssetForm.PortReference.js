define(['knockout', 'jquery', 'ttControl', 'iconHelper'], function (ko, $, tclib, ihLib) {
    var module = {
        PortReference: function (imList, obj) {
            var nself = this;
            //
            nself.ID = obj.ID;
            nself.Identifier = obj.Identifier;
            nself.TypeName = ko.observable(obj.TypeName);
            //
            nself.PortList = ko.observableArray([]);
            //            
            if (obj.PortList != null) {
                ko.utils.arrayForEach(obj.PortList, function (el) {
                    nself.PortList.push(new module.Port(el));
                });
                //
                nself.PortList.valueHasMutated();
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
        Port: function (obj) {
            var uself = this;
            var nself = parent;
            uself.Name = obj.Name;
        }
    };
    return module;
});