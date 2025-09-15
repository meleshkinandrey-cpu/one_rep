define(['jquery', 'signalRHubs'], function ($) {
    function init() {
        var self = this;
        //
        eventHub = $.connection.eventHub;
        if (eventHub) {
            var client = eventHub.client;
            client.objectInserted = function (objectClassID, objectID, parentObjectID) {
                $(document).trigger('objectInserted', [objectClassID, objectID, parentObjectID]);
            };
            client.objectUpdated = function (objectClassID, objectID, parentObjectID) {
                $(document).trigger('objectUpdated', [objectClassID, objectID, parentObjectID]);
            };
            client.objectDeleted = function (objectClassID, objectID, parentObjectID) {
                $(document).trigger('objectDeleted', [objectClassID, objectID, parentObjectID]);
            };
            //
            client.workflowOnSaveError = function (objectClassID, objectID, response) {
                $(document).trigger('workflowOnSaveError', [objectClassID, objectID, response]);
            };
            //
            client.externalEventCreated = function (objectID) {
                $(document).trigger('externalEventCreated', [objectID]);
            };
            client.externalEventProcessed = function (objectID) {
                $(document).trigger('externalEventProcessed', [objectID]);
            };
            //
            client.tsMessageInserted = function (messageID, timesheetID, ownerTimesheetID, authorID) {
                $(document).trigger('tsMessageInserted', [messageID, timesheetID, ownerTimesheetID, authorID]);
            };
            //
            client.progressBarProcessed = function (objectClassID, objectID, parentObjectID, percentage) {
                $(document).trigger('progressBarProcessed', [objectClassID, objectID, parentObjectID, percentage]);
            };
            //
            client.userSessionChanged = function (userID, userAgent) {
                $(document).trigger('userSessionChanged', [userID, userAgent]);
                //
                $.when(userD).done(function (user) {
                    if (user.UserID == userID && user.UserAgent == userAgent)
                        setLocation('Errors/Message?msg=' + escape(getTextResource('AdminTools_YourConnectionKilled')));
                });
            };
            //
            client.callAnswered = function (fromNumber) {
                $.when(userD).done(function (user) {
                    if (user.IncomingCallProcessing) {
                        showSpinner();
                        require(['usualForms'], function (lib) {
                            var fh = new lib.formHelper(true);
                            fh.ShowClientSearcher(fromNumber);
                        });
                    }
                });
            };
            //
            self.signalRhubInterval = null;//для автоматического переподключения
            self.stopReconnectInterval = function () {
                clearInterval(self.signalRhubInterval);
                self.signalRhubInterval = null;
            };
            //
            self.allNotificationsStopped = false;//флаг отключения от сервера после бездействия
            self.stopRefreshTimeout = null;//таймер бездействия страницы
            self.stopRefreshTimer = function () {
                clearTimeout(self.stopRefreshTimeout);
                self.stopRefreshTimeout = null;
            };
            //
            //close page
            if (getIEVersion() == -1) {
                window.onunload = function (event) {
                    self.allNotificationsStopped = true;
                    self.stopReconnectInterval();
                    self.stopRefreshTimer();
                    $.connection.hub.stop();
                };
            }
            $.connection.hub.start();
            //
            //0 - disconnected, 1 - connected, 2 - connectionSlow, reconnecting - 4
            $.connection.hub.stateChanged(function (states) {
                if (states.newState !== 1 && states.newState !== 2) {
                    if (self.signalRhubInterval == null) {
                        $('.b-connection-error').text(getTextResource('NoConnectionWithServer'));
                        $('.b-connection-error').css("display", "block");
                        
                        self.signalRhubInterval = setInterval(function () {
                            if (self.allNotificationsStopped == false)
                                $.connection.hub.start();//reconnect
                        }, 2000);
                    }
                }
                else if (states.newState === 1 || states.newState === 2) {
                    if (self.signalRhubInterval != null) {
                            $('.b-connection-error').css("display", "none");
                       // $('.b-connection-error').slideUp('fast');
                        self.stopReconnectInterval();
                    }
                }
            });
            function onVisibilityChange(callback) {
                var visible = true;
                function focused() {
                    if (!visible)
                        callback(visible = true);
                }
                function unfocused() {
                    if (visible)
                        callback(visible = false);
                }
                //
                if ('hidden' in document) {
                    document.addEventListener('visibilitychange',
                        function () { (document.hidden ? unfocused : focused)() });
                }
                if ('mozHidden' in document) {
                    document.addEventListener('mozvisibilitychange',
                        function () { (document.mozHidden ? unfocused : focused)() });
                }
                if ('webkitHidden' in document) {
                    document.addEventListener('webkitvisibilitychange',
                        function () { (document.webkitHidden ? unfocused : focused)() });
                }
                if ('msHidden' in document) {
                    document.addEventListener('msvisibilitychange',
                        function () { (document.msHidden ? unfocused : focused)() });
                }
                //<=IE9:
                if ('onfocusin' in document) {
                    document.onfocusin = focused;
                    document.onfocusout = unfocused;
                }
                //others:
                window.onpageshow = window.onfocus = focused;
                window.onpagehide = window.onblur = unfocused;
                //hack:
                document.addEventListener('mousemove', focused);
            };
            function setVisible(visible) {
                if (visible == true) {
                    self.stopRefreshTimer();
                    self.allNotificationsStopped = false;//reconnect in interval                        
                }
                else if (document.canDisconnect != false)
                    self.stopRefreshTimeout = setTimeout(function () {
                        self.stopRefreshTimer();
                        self.allNotificationsStopped = true;
                        $.connection.hub.stop();
                    }, 1000 * 60 * 3);
            };
            //page hide/show, not active/active
            onVisibilityChange(setVisible);
        }
        else
            require(['sweetAlert'], function () {
                swal(getTextResource('UnhandledErrorClient'), getTextResource('AjaxError') + '\n[eventManager.js, init]', 'error');
            });
    }
    //
    return {
        init: init
    };
});