define(['knockout', 'jquery', 'models/SDForms/SDForm.User'], function (ko, $, userLib) {
    var module = {
        ProjectReference: function (imList, obj) {
            var self = this;
            //
            self.ClassID = ko.observable(371);
            //
            self.CanEdit = ko.observable(false);
            //
            if (obj.ID)
                self.ID = ko.observable(obj.ID)
            else self.ID = ko.observable('');
            if (obj.Number)
                self.Number = ko.observable(obj.Number)
            else self.Number = ko.observable('');
            if (obj.Name)
                self.Name = ko.observable(obj.Name)
            else self.Name = ko.observable('');
            if (obj.HtmlNote)
                self.HtmlNote = ko.observable(obj.HtmlNote)
            else self.HtmlNote = ko.observable('');
            //
            if (obj.InitiatorID)
                self.InitiatorID = ko.observable(obj.InitiatorID)
            else self.InitiatorID = ko.observable('');
            self.InitiatorLoaded = ko.observable(false);
            self.Initiator = ko.observable(null);
            //
            if (obj.DirectorID)
                self.DirectorID = ko.observable(obj.DirectorID)
            else self.DirectorID = ko.observable('');
            if (obj.DirectorName)
                self.DirectorName = ko.observable(obj.DirectorName)
            else self.DirectorName = ko.observable('');
            self.DirectorLoaded = ko.observable(false);
            self.Director = ko.observable(null);
            //
            if (obj.WorkOrderCount)
                self.WorkOrderCount = ko.observable(obj.WorkOrderCount);
            else self.WorkOrderCount = ko.observable(0);
            if (obj.StateID)
                self.StateID = ko.observable(obj.StateID)
            else self.StateID = ko.observable(null);
            if (obj.StateName)
                self.StateName = ko.observable(obj.StateName)
            else self.StateName = ko.observable('Состояние');

            self.ManHours = ko.observable(obj.ManHours);
            //
            self.UtcDatePlanStart = ko.observable(obj.UtcDatePlanStart ? parseDate(obj.UtcDatePlanStart) : '');
            self.UtcDatePlanStartDT = ko.observable(obj.UtcDatePlanStart ? new Date(parseInt(obj.UtcDatePlanStart)) : null);
            //
            self.UtcDatePlanEnd = ko.observable(obj.UtcDatePlanEnd ? parseDate(obj.UtcDatePlanEnd) : '');
            self.UtcDatePlanEndDT = ko.observable(obj.UtcDatePlanEnd ? new Date(parseInt(obj.UtcDatePlanEnd)) : null);
            //
            self.UtcDateStart = ko.observable(obj.UtcDateStart ? parseDate(obj.UtcDateStart) : '');
            self.UtcDateStartDT = ko.observable(obj.UtcDateStart ? new Date(parseInt(obj.UtcDateStart)) : null);
            //
            self.UtcDateEnd = ko.observable(obj.UtcDateEnd ? parseDate(obj.UtcDateEnd) : '');
            self.UtcDateEndDT = ko.observable(obj.UtcDateEnd ? new Date(parseInt(obj.UtcDateEnd)) : null);
            //
            self.NumberName = ko.computed(function () {
                return '№ ' + self.Number() + ' ' + self.Name();
            });
            //
            self.Selected = ko.observable(false);
            self.Selected.subscribe(function (newValue) {
                if (newValue)
                    imList.ItemChecked(self);
                else
                    imList.ItemUnchecked(self);
            });
            //
            self.Merge = function (newValue) {
            };
            //
            self.CssIconClass = ko.computed(function () {
                return 'project-icon';
            });
            //
            var options = {
                UserID: self.DirectorID(),
                UserType: userLib.UserTypes.director,
                UserName: self.DirectorName(),
                EditAction: null,
                RemoveAction: null
            };
            //
            if (self.DirectorID() != '')
                self.DirectorObj = ko.observable(new userLib.User(self, options));
            else
                self.DirectorObj = ko.observable(null);
        }
    };
    return module;
});