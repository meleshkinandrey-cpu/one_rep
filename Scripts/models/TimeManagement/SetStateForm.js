define(['knockout', 'jquery', 'ajax'], function (ko, $, ajaxLib) {
    var module = {
        ViewModel: function ($region, timeSheetIDArray, newTimeSheetStateID) {
            var self = this;
            self.ajaxControl = new ajaxLib.control();
            self.htmlControl = null;
            //
            self.HTMLNote = ko.observable('');
            self.NotifyByEmail = ko.observable(false);
            //
            self.SetStateByForm = function () {
                var retval = $.Deferred();
                //
                var html = self.htmlControl == null ? '' : self.htmlControl.GetHTML();
                var notify = self.NotifyByEmail();
                //
                if (self.htmlControl != null)
                    $.when(self.htmlControl.firstLoadD).done(function () {
                        var d = self.SetState(html, notify);
                        $.when(d).done(function (value) {
                            retval.resolve(value);
                        });
                    });
                else {
                    var d = self.SetState(html, notify);
                    $.when(d).done(function (value) {
                        retval.resolve(value);
                    });
                }
                //
                return retval;
            };
            //
            self.AfterRender = function () {
                require(['htmlControl'], function (module) {
                    self.htmlControl = new module.control($('.timeSheetState-container').find('.text-input'), false);
                    setTimeout(function () { self.htmlControl.Focus(); }, 500);
                });
            };
            //
            self.SetState = function (htmlNote, notifyByEmail) {
                var retval = $.Deferred();
                //
                self.ajaxControl.Ajax($region,
                    {
                        dataType: "json",
                        method: 'POST',
                        data: {
                            TimeSheetIDs: ko.toJSON(timeSheetIDArray),
                            StateID: newTimeSheetStateID,
                            HTMLMessage: htmlNote,
                            TimezoneOffsetInMinutes: new Date().getTimezoneOffset(),
                            NotifyByEmail: notifyByEmail
                        },
                        url: 'sdApi/SetTimeSheetState'
                    },
                    function (result) {
                        retval.resolve(result === 0);
                        //
                        if (result === 1)//NullParamsError
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[TimeManagement.SetStateForm.js, SetState]', 'error');
                            });
                        else if (result === 3)//AccessError
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                            });
                        else if (result === 6)//ObjectDeleted
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                            });
                        else if (result === 7)//OperationError
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('OperationError'), 'error');
                            });
                        else if (result === 4)//GlobalError
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.SetStateForm.js, SetState]', 'error');
                            });
                        else if (result != 0)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.SetStateForm.js, SetState]', 'error');
                            });
                    });
                //
                return retval.promise();
            };
        }
    }
    return module;
});