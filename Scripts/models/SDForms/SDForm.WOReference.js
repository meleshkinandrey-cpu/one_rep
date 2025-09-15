define(['knockout', 'jquery', 'models/SDForms/SDForm.User'], function (ko, $, userLib) {
    var module = {
        WorkOrderReference: function (imList, obj) {
            var wself = this;
            //
            wself.ID = obj.ID;
            //
            wself.CanEdit = ko.observable(false);
            //
            if (obj.Number)
                wself.Number = ko.observable(obj.Number);
            else wself.Number = ko.observable('');
            //
            if (obj.Name)
                wself.Name = ko.observable(obj.Name);
            else wself.Name = ko.observable('');
            //
            if (obj.TypeID)
                wself.TypeID = ko.observable(obj.TypeID);
            else wself.TypeID = ko.observable('');
            //
            if (obj.TypeName)
                wself.TypeName = ko.observable(obj.TypeName);
            else wself.TypeName = ko.observable('');
            //
            if (obj.WorkflowImageSource)
                wself.WorkflowImageSource = ko.observable(obj.WorkflowImageSource);
            else wself.WorkflowImageSource = ko.observable('');
            //
            if (obj.WorkflowSchemeID)
                wself.WorkflowSchemeID = ko.observable(obj.WorkflowSchemeID);
            else wself.WorkflowSchemeID = ko.observable('');
            //
            if (obj.EntityStateName)
                wself.EntityStateName = ko.observable(obj.EntityStateName);
            else wself.EntityStateName = ko.observable('');
            //
            if (obj.ManHours)
                wself.ManHours = ko.observable(obj.ManHours)
            else wself.ManHours = ko.observable('');
            //
            if (obj.ManhoursNorm)
                wself.ManhoursNorm = ko.observable(obj.ManhoursNorm)
            else wself.ManhoursNorm = ko.observable('');
            //
            if (obj.ExecutorID)
                wself.ExecutorID = ko.observable(obj.ExecutorID);
            else wself.ExecutorID = ko.observable('');
            //
            if (obj.ExecutorName)
                wself.ExecutorName = ko.observable(obj.ExecutorName);
            else wself.ExecutorName = ko.observable('');
            //
            if (obj.QueueID)
                wself.QueueID = ko.observable(obj.QueueID);
            else wself.QueueID = ko.observable('');
            //
            if (obj.QueueName)
                wself.QueueName = ko.observable(obj.QueueName);
            else wself.QueueName = ko.observable('');
            //
            if (obj.UtcDatePromised)
                wself.UtcDatePromised = ko.observable(parseDate(obj.UtcDatePromised));
            else wself.UtcDatePromised = ko.observable('');
            //
            if (obj.UtcDateModified)
                wself.UtcDateModified = ko.observable(parseDate(obj.UtcDateModified));
            else wself.UtcDateModified = ko.observable('');
            //
            var options = { };
            wself.IsClientMode = ko.observable(true);//sd.user form
            if (wself.ExecutorID() != '' || wself.QueueID() != '') {
                if (wself.ExecutorID()) {
                    options = {
                        UserID: wself.ExecutorID(),
                        UserType: userLib.UserTypes.executor,
                        UserName: wself.ExecutorName(),
                        EditAction: null,
                        RemoveAction: null
                    };
                }
                else if (wself.QueueID()) {
                    options = {
                        UserID: wself.QueueID(),
                        UserType: userLib.UserTypes.queueExecutor,
                        UserName: wself.QueueName(),
                        EditAction: null,
                        RemoveAction: null
                    };
                }
                //
                wself.ExecutorObj = ko.observable(new userLib.User(wself, options));
            }
            else
                wself.ExecutorObj = ko.observable(null);
            //
            wself.Executor = ko.computed(function () {
                return wself.ExecutorName;
            });
            //
            wself.Modify = ko.computed(function () {
                var retval = getTextResource('LastChange') + ': ' + wself.UtcDateModified();
                return retval;
            });
            //
            wself.CssIconClass = ko.computed(function () {
                if (wself.WorkflowSchemeID())
                    return 'workorder-icon';
                else return 'finished-item-icon';
            });
            //
            wself.NumberName = ko.computed(function () {
                return '№ ' + wself.Number() + ' ' + wself.Name();
            });
            //
            wself.Selected = ko.observable(false);
            wself.Selected.subscribe(function (newValue) {
                if (newValue)
                    imList.ItemChecked(wself);
                else
                    imList.ItemUnchecked(wself);
            });
            //
            wself.Merge = function (newValue) {
                wself.Number(newValue.Number);
                wself.Name(newValue.Name);
                wself.TypeID(newValue.TypeID);
                wself.TypeName(newValue.TypeName);
                wself.WorkflowSchemeID(newValue.WorkflowSchemeID);
                wself.WorkflowImageSource(newValue.WorkflowImageSource);
                wself.EntityStateName(newValue.EntityStateName);
                wself.ManHours(newValue.ManHours)
                wself.ManhoursNorm(newValue.ManhoursNorm)
                wself.ExecutorID(newValue.ExecutorID);
                wself.ExecutorName(newValue.ExecutorName);
                wself.QueueID(newValue.QueueID);
                wself.QueueName(newValue.QueueName);
                wself.UtcDatePromised(parseDate(newValue.UtcDatePromised));
                wself.UtcDateModified(parseDate(newValue.UtcDateModified));
            };
        }
    };
    return module;
});