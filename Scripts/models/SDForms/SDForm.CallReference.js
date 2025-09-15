define(['knockout', 'jquery', 'models/SDForms/SDForm.User'], function (ko, $, userLib) {
    var module = {
        CallReference: function (imList, obj) {
            var cself = this;
            //
            cself.ClassID = ko.observable(701);
            //
            cself.ID = obj.ID;
            //
            cself.CanEdit = ko.observable(false);
            //
            if (obj.Number)
                cself.Number = ko.observable(obj.Number);
            else cself.Number = ko.observable('');
            //
            if (obj.Name)
                cself.Name = ko.observable(obj.Name);
            else cself.Name = ko.observable('');
            //
            //
            if (obj.CallSummary)
                cself.CallSummary = ko.observable(obj.CallSummary);
            else cself.CallSummary = ko.observable('');
            //
            if (obj.TypeID)
                cself.TypeID = ko.observable(obj.TypeID);
            else cself.TypeID = ko.observable('');
            //
            if (obj.TypeName)
                cself.TypeName = ko.observable(obj.TypeName);
            else cself.TypeName = ko.observable('');
            //
            if (obj.WorkflowImageSource)
                cself.WorkflowImageSource = ko.observable(obj.WorkflowImageSource);
            else cself.WorkflowImageSource = ko.observable('');
            //
            if (obj.WorkflowSchemeID)
                cself.WorkflowSchemeID = ko.observable(obj.WorkflowSchemeID);
            else cself.WorkflowSchemeID = ko.observable('');
            //
            if (obj.EntityStateName)
                cself.EntityStateName = ko.observable(obj.EntityStateName);
            else cself.EntityStateName = ko.observable('');
            //
            if (obj.ManHours)
                cself.ManHours = ko.observable(obj.ManHours)
            else cself.ManHours = ko.observable('');
            //
            if (obj.ManhoursNorm)
                cself.ManhoursNorm = ko.observable(obj.ManhoursNorm)
            else cself.ManhoursNorm = ko.observable('');
            //
            if (obj.ClientID)
                cself.ClientID = ko.observable(obj.ClientID);
            else cself.ClientID = ko.observable('');
            //
            if (obj.ClientName)
                cself.ClientName = ko.observable(obj.ClientName);
            else cself.ClientName = ko.observable('');
            //
            if (obj.UtcDatePromised)
                cself.UtcDatePromised = ko.observable(parseDate(obj.UtcDatePromised));
            else cself.UtcDatePromised = ko.observable('');
            //
            if (obj.UtcDateModified)
                cself.UtcDateModified = ko.observable(parseDate(obj.UtcDateModified));
            else cself.UtcDateModified = ko.observable('');
            //
            var options = {
                UserID: cself.ClientID(),
                UserType: userLib.UserTypes.client,
                UserName:  cself.ClientName(),
                EditAction: null,
                RemoveAction: null
            };
            cself.IsClientMode = ko.observable(true);//sd.user form
            if (cself.ClientID() != '')
                cself.ClientObj = ko.observable(new userLib.User(cself, options));
            else
                cself.ClientObj = ko.observable(null);
            //
            cself.Client = ko.computed(function () {
                return cself.ClientName();
            });
            //
            cself.Modify = ko.computed(function () {
                var retval = getTextResource('LastChange') + ': ' + cself.UtcDateModified();
                return retval;
            });
            //
            cself.CssIconClass = ko.computed(function () {
                if (cself.WorkflowSchemeID())
                    return 'call-icon';
                else return 'finished-item-icon';
            });
            //
            cself.NumberName = ko.computed(function () {
                return '№ ' + cself.Number() + ' ' + (cself.CallSummary() ? cself.CallSummary() : cself.Name());
            });
            //
            cself.Selected = ko.observable(false);
            cself.Selected.subscribe(function (newValue) {
                if (newValue)
                    imList.ItemChecked(cself);
                else
                    imList.ItemUnchecked(cself);
            });
            //
            cself.Merge = function (newValue) {
                cself.Number(newValue.Number);
                cself.CallSummary(newValue.CallSummary);
                cself.TypeID(newValue.TypeID);
                cself.TypeName(newValue.TypeName);
                cself.WorkflowImageSource(newValue.WorkflowImageSource);
                cself.WorkflowSchemeID(newValue.WorkflowSchemeID);
                cself.EntityStateName(newValue.EntityStateName);
                cself.ManHours(newValue.ManHours)
                cself.ManhoursNorm(newValue.ManhoursNorm)
                cself.ClientID(newValue.ClientID);
                cself.ClientName(newValue.ClientName);
                cself.UtcDatePromised(parseDate(newValue.UtcDatePromised));
                cself.UtcDateModified(parseDate(newValue.UtcDateModified));
            };
        }
    };
    return module;
});