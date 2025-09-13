define(['knockout', 'jquery', 'ajax', 'models/SDForms/SDForm.User'], function (ko, $, ajaxLib, userLib) {
    var module = {
        Project: function (parentSelf, projectData) {
            var mself = this;
            var self = parentSelf;
            //
            if (projectData.ID)
                mself.ID = ko.observable(projectData.ID)
            else mself.ID = ko.observable('');
            if (projectData.Number)
                mself.Number = ko.observable(projectData.Number)
            else mself.Number = ko.observable('');
            if (projectData.Name)
                mself.Name = ko.observable(projectData.Name)
            else mself.Name = ko.observable('');
            if (projectData.HtmlNote)
                mself.HtmlNote = ko.observable(projectData.HtmlNote)
            else mself.HtmlNote = ko.observable('');
            //
            if (projectData.InitiatorID)
                mself.InitiatorID = ko.observable(projectData.InitiatorID)
            else mself.InitiatorID = ko.observable('');
            mself.InitiatorLoaded = ko.observable(false);
            mself.Initiator = ko.observable(null);
            //
            if (projectData.DirectorID)
                mself.DirectorID = ko.observable(projectData.DirectorID)
            else mself.DirectorID = ko.observable('');
            mself.DirectorLoaded = ko.observable(false);
            mself.Director = ko.observable(null);
            //
            if (projectData.WorkOrderCount)
                mself.WorkOrderCount = ko.observable(projectData.WorkOrderCount);
            else mself.WorkOrderCount = ko.observable(0);
            if (projectData.StateID)
                mself.StateID = ko.observable(projectData.StateID)
            else mself.StateID = ko.observable(null);
            if (projectData.StateName)
                mself.StateName = ko.observable(projectData.StateName)
            else mself.StateName = ko.observable('Состояние');
            //
            mself.ManHours = ko.observable(projectData.ManHours);
            //
            mself.UtcDatePlanStart = ko.observable(projectData.UtcDatePlanStart ? parseDate(projectData.UtcDatePlanStart) : '');
            mself.UtcDatePlanStartDT = ko.observable(projectData.UtcDatePlanStart ? new Date(parseInt(projectData.UtcDatePlanStart)) : null);
            //
            mself.UtcDatePlanEnd = ko.observable(projectData.UtcDatePlanEnd ? parseDate(projectData.UtcDatePlanEnd) : '');
            mself.UtcDatePlanEndDT = ko.observable(projectData.UtcDatePlanEnd ? new Date(parseInt(projectData.UtcDatePlanEnd)) : null);
            //
            mself.UtcDateStart = ko.observable(projectData.UtcDateStart ? parseDate(projectData.UtcDateStart) : '');
            mself.UtcDateStartDT = ko.observable(projectData.UtcDateStart ? new Date(parseInt(projectData.UtcDateStart)) : null);
            //
            mself.UtcDateEnd = ko.observable(projectData.UtcDateEnd ? parseDate(projectData.UtcDateEnd) : '');
            mself.UtcDateEndDT = ko.observable(projectData.UtcDateEnd ? new Date(parseInt(projectData.UtcDateEnd)) : null);
        }
    };
    return module;
});