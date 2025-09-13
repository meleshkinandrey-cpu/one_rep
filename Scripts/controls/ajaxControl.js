define(['knockout', 'jquery'], function (ko, $) {
    var module = {
        control: function () {
            var self = this;
            //           
            self.showDefaultError = function (e) {
                var text = '';
                if (e && e.statusText)
                    text = '\n' + e.statusText;
                //
                require(['sweetAlert'], function () {
                    swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + text + '\n[ajaxControl.js]', 'error');
                });
            };
            //
            self.xhr = null;
            self.container = null;
            self.Ajax = function ($container, ajaxSettings, onSuccess, onError, onComplete) {
                self.Abort();
                //
                var d = $.Deferred();
                //
                var ajaxConfig = {
                    dataType: "json",
                    method: '',
                    url: '',
                    data: {}
                };
                $.extend(ajaxConfig, ajaxSettings);
                extendAjaxData(ajaxConfig.data);
                //
                if (onSuccess)
                    ajaxConfig.success = onSuccess;
                //
                ajaxConfig.error = function (e) {
                    if (e.status === 0) {
                        if (e.statusText === 'abort') {
                            // Has been aborted
                            return;
                        } else {
                            // Offline mode
                            return;
                        }
                    } else if (e.status == 403) {
                        setLocation('Account/Authenticate');//global.asax
                        return;
                    } else if (e.status == 200 && e.responseText) {//all is ok, jquery didnt parse json and think there are error
                        var json = JSON.parse(e.responseText);
                        //
                        if (onSuccess && json) {
                            onSuccess(json);
                            //
                            return;
                        }
                    }
                    //
                    if (onError)
                        onError();
                    else
                        self.showDefaultError(e);
                };
                //
                if (onComplete)
                    ajaxConfig.complete = onComplete;
                //                
                self.container = $container;
                if ($container && $container[0])
                    showSpinner($container[0]);
                //
                //for slow test
                //setTimeout(function () {
                self.IsAcitve(true);
                self.xhr = $.ajax(ajaxConfig).done(function () {
                    d.resolve();
                }).fail(function () {
                    d.fail();
                }).always(function () {
                    if ($container && $container[0]) {
                        hideSpinner($container[0]);
                    }
                    self.xhr = null;
                    self.IsAcitve(false);
                });
                //}, 3000);
                //
                return d.promise();
            };
            //
            self.IsAcitve = ko.observable(false);
            //
            self.Abort = function () {
                var xhr = self.xhr;
                if (xhr) {
                    xhr.abort();
                    self.xhr = null;
                }
                //
                var container = self.container;
                if (container && container[0])
                    hideSpinner(container[0]);
                self.container = null;
            };
        }
    }
    return module;
});