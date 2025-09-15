define(['knockout', 'jquery', 'ajax'], function (ko, $, ajaxLib) {
    var module = {
        TapeRecord: function (obj, options) {
            var self = this;
            //
            self.entityClassID = options.entityClassID;
            self.entityID = options.entityID;
            //
            self.ID = obj.ID;
            self.Type = ko.observable(options.type);
            self.Text = ko.observable(obj.Message);
            self.AuthorID = ko.observable(obj.UserID);
            self.AuthorFullName = ko.observable(obj.UserName);
            if (obj.IsReaded != undefined)
                self.IsReaded = ko.observable(obj.IsReaded);
            else
                self.IsReaded = ko.observable(true);
            if (obj.IsNote != undefined)
                self.IsNote = ko.observable(obj.IsNote);
            else
                self.IsNote = ko.observable(false);
            //
            self.LocalDate = ko.observable(parseDate(obj.DateForJs));
            self.DateObj = ko.observable(new Date(getUtcDate(obj.UtcDate)));
            //
            self.Merge = function (newData) {
                if (!newData)
                    return;
                //
                if (newData.Message != undefined)
                    self.Text(newData.Message);
                if (newData.AuthorID != undefined)
                    self.AuthorID(newData.UserID);
                if (newData.AuthorFullName != undefined)
                    self.AuthorFullName(newData.UserName);
                if (newData.IsReaded != undefined)
                    self.IsReaded(newData.IsReaded);
                if (newData.IsNote != undefined)
                    self.IsNote(newData.IsNote);
                if (newData.DateForJs != undefined)
                    self.LocalDate(parseDate(newData.DateForJs));
                if (newData.UtcDate != undefined)
                    self.DateObj(new Date(getUtcDate(newData.UtcDate)));
            };
        }
    };
    return module;
});