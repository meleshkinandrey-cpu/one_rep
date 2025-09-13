define(['knockout', 'jquery', 'ajax'], function (ko, $, ajaxLib) {
    var module = {
        VoteMode: {
            For: 'for',
            Against: 'against'
        },
        ViewModel: function (negID, objID, comment, regionID, userID) {
            var self = this;
            //
            self.regionID = regionID;
            self.negotiationID = negID;
            self.objID = objID;
            self.UserID = userID ? userID : null;
            self.ForseClose = undefined;//задается в формхелпере
            //
            self.Comment = ko.observable(comment ? comment() : '');
            //
            self.AfterRender = function () {
                var textbox = $(document).find('.negotiation-message-form-comment');
                textbox.click();
                textbox.focus();
            };

            self.ajaxControl_message = new ajaxLib.control();
            self.PostMessage = function () {
                var data = {
                    'NegotiationID': self.negotiationID,
                    'Comment': self.Comment(),
                    'VotedUserID': self.UserID
                };
                var PostD = $.Deferred();
                self.ajaxControl_message.Ajax($('#' + self.regionID),
                    {
                        dataType: "json",
                        method: 'POST',
                        data: data,
                        url: 'sdApi/NegotiationMessage'
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            var retval = {};
                            retval.Message = self.Comment();
                            //
                            PostD.resolve(retval);
                            //
                            $(document).trigger('local_objectUpdated', [160, self.negotiationID, self.objID]);//OBJ_NEGOTIATION
                            return;
                        }
                        else if (newVal.Result === 1)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('NullParamsError'), 'error');
                            });
                        else if (newVal.Result === 2)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('BadParamsError'), 'error');
                            });
                        else if (newVal.Result === 3)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('AccessError'), 'error');
                            });
                        else if (newVal.Result === 5)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('ConcurrencyErrorWithoutQuestion'), 'error');
                            });
                        else if (newVal.Result === 6)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('ObjectDeleted'), 'error');
                                //
                                if (self.ForseClose != undefined) {
                                    self.ForseClose();
                                    $(document).trigger('local_objectDeleted', [160, self.negotiationID, self.objID]);
                                }
                            });
                        else if (newVal.Result === 8)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('ValidationError'), 'error');
                            });
                        else if (newVal.Result === 10)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('NegotiationAlreadyEnded'), '', 'info');
                                //
                                if (self.ForseClose != undefined)
                                    self.ForseClose();
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[SDForm.NegotiationVote.js, PostVote]', 'error');
                            });
                        PostD.resolve(null);
                    });
                return PostD.promise();
            };
            //
            self.Unload = function () {
                $(document).unbind('objectDeleted', self.onObjectModified);
            };
            self.onObjectModified = function (e, objectClassID, objectID, parentObjectID) {
                if (objectClassID == 160) {
                    if (self.negotiationID && objectID == self.negotiationID && parentObjectID == self.objID) {
                        if (e.type == 'objectDeleted') {
                            if (self.ForseClose != undefined)
                                self.ForseClose();
                        }
                    }
                }
            };
        }
    };
    return module;
});