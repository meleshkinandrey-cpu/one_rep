define(['knockout', 'jquery', 'ttControl', 'ajax'], function (ko, $, tclib, ajaxLib) {
    var module = {
        createCell: function (column, text, imageSource, row) {
            this.Column = column;
            this.Text = text == null ? '' : text;
            this.ImageSource = imageSource;
            //
            this.Row = row;
        },
        noteInfo: function (noteCount, messageCount, unreadMessageCount) {
            var thisObj = this;
            //
            thisObj.NoteCount = noteCount;
            thisObj.MessageCount = messageCount;
            thisObj.UnreadMessageCount = unreadMessageCount;
        },
        operationInfo: function (objectName, inControl, ownerID, noteInfo, canBePicked) {
            var thisObj = this;
            //
            thisObj.ObjectName = objectName;
            thisObj.InControl = inControl;
            thisObj.OwnerClassID = ownerClassID;
            thisObj.OwnerID = ownerID;
            thisObj.CanBePicked = canBePicked;
            thisObj.NoteInfo = noteInfo;
            thisObj.UserID = userID;
        },
        createRow: function (id, classID, realObjectID, operationInfo, showFormFunc, rowSelectedFunc, thumbResizeCatchFunc, moveTrumbDataFunc, data) {
            var mself = this;
            //
            mself.Cells = ko.observableArray([]);
            mself.ID = id;
            mself.RealObjectID = realObjectID;
            mself.ClassID = classID;
            mself.OperationInfo = operationInfo;
            mself.AddCell = function (columnSettings, text, imageSource) {
                mself.Cells().push(new module.createCell(columnSettings, text, imageSource, mself));
            };
            //
            mself.Checked = ko.observable(false);
            mself.Checked.subscribe(function (newValue) {
                rowSelectedFunc(mself, newValue);
            });
            //
            mself.ShowForm = showFormFunc;
            mself.thumbResizeCatch = thumbResizeCatchFunc;
            mself.moveTrumbData = moveTrumbDataFunc;
            //
            mself.Data = data;
        }
    }
    return module;
});