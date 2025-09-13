define(['knockout', 'jquery', 'iconHelper'], function (ko, $, ihLib) {
    var module = {
        Link: function (imList, obj) {
            var nself = this;
            //
            nself.EntityID = obj.EntityID;
            nself.ID = obj.ID;
            nself.Name = obj.Name;
            nself.Location = obj.Location;
            nself.ClassName = obj.ClassName;
            nself.Note = obj.Note;
            nself.Locked = obj.Locked;
            nself.ClassID = ko.observable(obj.ClassID);
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
        }
    };
    return module;
});