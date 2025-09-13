define(['knockout', 'jquery', 'ttControl', 'iconHelper'], function (ko, $, tclib, ihLib) {
    var module = {
        Asset: function (imList, obj) {
            var nself = this;
            //
            nself.ID = obj.ID;
            nself.Name = obj.Name;
            nself.State = obj.State;
            nself.Type = obj.Type;
            nself.Model = obj.Model;
            nself.InvNumber = obj.InvNumber;
            nself.SerialNumber = obj.SerialNumber;
            nself.Code = obj.Code;
            nself.ClassID = ko.observable(obj.ClassID);
            //
            nself.AdapterList = ko.observableArray([]);
            //            
            if (obj.AdapterList != null) {
                ko.utils.arrayForEach(obj.AdapterList, function (el) {
                    nself.AdapterList.push(new module.Adapter(el));
                });
                //
                nself.AdapterList.valueHasMutated();
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
                return ihLib.getIconByClassID(nself.ClassID());
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
        Adapter: function (obj) {
            var uself = this;
            var nself = parent;
            uself.Name = obj.Name;
        }
    };
    return module;
});