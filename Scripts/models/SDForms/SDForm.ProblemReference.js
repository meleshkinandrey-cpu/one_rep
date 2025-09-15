define(['knockout', 'jquery', 'models/SDForms/SDForm.User'], function (ko, $, userLib) {
    var module = {
        ProblemReference: function (imList, obj) {
            var pself = this;
            //
            pself.ClassID = ko.observable(702);
            //
            pself.ID = obj.ID;
            //
            pself.CanEdit = ko.observable(false);
            //
            if (obj.Number)
                pself.Number = ko.observable(obj.Number);
            else pself.Number = ko.observable('');
            //
            if (obj.Name)
                pself.Name = ko.observable(obj.Name);
            else pself.Name = ko.observable('');
            //
            if (obj.Summary)
                pself.Summary = ko.observable(obj.Summary);
            else pself.Summary = ko.observable('');
            //
            if (obj.TypeID)
                pself.TypeID = ko.observable(obj.TypeID);
            else pself.TypeID = ko.observable('');
            //
            if (obj.TypeName)
                pself.TypeName = ko.observable(obj.TypeName);
            else pself.TypeName = ko.observable('');
            //
            if (obj.WorkflowImageSource)
                pself.WorkflowImageSource = ko.observable(obj.WorkflowImageSource);
            else pself.WorkflowImageSource = ko.observable('');
            //
            if (obj.WorkflowSchemeID)
                pself.WorkflowSchemeID = ko.observable(obj.WorkflowSchemeID);
            else pself.WorkflowSchemeID = ko.observable('');
            //
            if (obj.EntityStateName)
                pself.EntityStateName = ko.observable(obj.EntityStateName);
            else pself.EntityStateName = ko.observable('');
            //
            if (obj.ManHours)
                pself.ManHours = ko.observable(obj.ManHours)
            else pself.ManHours = ko.observable('');
            //
            if (obj.ManhoursNorm)
                pself.ManhoursNorm = ko.observable(obj.ManhoursNorm)
            else pself.ManhoursNorm = ko.observable('');
            //
            if (obj.OwnerID)
                pself.OwnerID = ko.observable(obj.OwnerID);
            else pself.OwnerID = ko.observable('');
            //
            if (obj.OwnerName)
                pself.OwnerName = ko.observable(obj.OwnerName);
            else pself.OwnerName = ko.observable('');
            //
            if (obj.UtcDatePromised)
                pself.UtcDatePromised = ko.observable(parseDate(obj.UtcDatePromised));
            else pself.UtcDatePromised = ko.observable('');
            //
            if (obj.UtcDateModified)
                pself.UtcDateModified = ko.observable(parseDate(obj.UtcDateModified));
            else pself.UtcDateModified = ko.observable('');
            //
            var options = {
                UserID: pself.OwnerID(),
                UserType: userLib.UserTypes.owner,
                UserName: pself.OwnerName(),
                EditAction: null,
                RemoveAction: null
            };
            pself.IsClientMode = ko.observable(true);//sd.user form
            if (pself.OwnerID() != '')
                pself.OwnerObj = ko.observable(new userLib.User(pself, options));
            else
                pself.OwnerObj = ko.observable(null);
            //
            pself.Owner = ko.computed(function () {
                return pself.OwnerName();
            });
            //
            pself.Modify = ko.computed(function () {
                var retval = getTextResource('LastChange') + ': ' + pself.UtcDateModified();
                return retval;
            });
            //
            pself.CssIconClass = ko.computed(function () {
                if (pself.WorkflowSchemeID())
                    return 'problem-icon';
                else return 'finished-item-icon';
            });
            //
            pself.NumberName = ko.computed(function () {
                return '№ ' + pself.Number() + ' ' + (pself.Summary() ? pself.Summary() : pself.Name());
            });
            //
            pself.Selected = ko.observable(false);
            pself.Selected.subscribe(function (newValue) {
                if (newValue)
                    imList.ItemChecked(pself);
                else
                    imList.ItemUnchecked(pself);
            });
            //
            pself.Merge = function (newValue) {
                pself.Number(newValue.Number);
                pself.Summary(newValue.Summary);
                pself.TypeID(newValue.TypeID);
                pself.TypeName(newValue.TypeName);
                pself.WorkflowSchemeID(newValue.WorkflowSchemeID);
                pself.WorkflowImageSource(newValue.WorkflowImageSource);
                pself.EntityStateName(newValue.EntityStateName);
                pself.ManHours(newValue.ManHours)
                pself.ManhoursNorm(newValue.ManhoursNorm)
                pself.OwnerID(newValue.OwnerID);
                pself.OwnerName(newValue.OwnerName);
                pself.UtcDatePromised(parseDate(newValue.UtcDatePromised));
                pself.UtcDateModified(parseDate(newValue.UtcDateModified));
            };
        }
    };
    return module;
});