define(['knockout', 'jquery', 'ajax', 'comboBox'], function (ko, $, ajaxLib) {
    var module = {
        ViewModel: function () {
            var self = this;
            //
            self.setting = null;
            //
            {//language
                self.LanguageList = ko.observableArray([]);
                self.LanguageListD = $.Deferred();
                self.SelectedLanguage = ko.observable(null);
                self.SelectedLanguage.subscribe(function (newValue) {
                    if (self.setting != null) {
                        if (self.setting.CultureName == newValue.ID)
                            return;
                        self.setting.CultureName = newValue.ID;
                        self.Save(true);
                    }
                });
                //
                self.getLanguageList = function (options) {
                    var data = self.LanguageList();
                    options.callback({ data: data, total: data.length });
                };
                var createLanguage = function (languageInfo) {
                    var thisObj = this;
                    //
                    thisObj.ID = languageInfo.ID;
                    thisObj.Name = languageInfo.Name;
                    thisObj.Description = languageInfo.Description;
                    thisObj.Image = languageInfo.Image;
                };
                self.LoadLanguageList = function () {
                    if (self.LanguageList().length > 0)
                        return;
                    //
                    var ajaxControl = new ajaxLib.control();
                    ajaxControl.Ajax(null,
                        {
                            dataType: 'json',
                            url: 'resourceApi/GetLanguages',
                            method: 'GET'
                        },
                        function (response) {
                            if (response) {
                                self.LanguageList.removeAll();
                                //
                                $.each(response, function (index, languageInfo) {
                                    var l = new createLanguage(languageInfo);
                                    self.LanguageList().push(l);
                                });
                                self.LanguageList.valueHasMutated();
                            } else
                                setLocation('Errors/PageNotFound');
                            //
                            self.LanguageListD.resolve();
                        });
                };
                self.SetSelectedLanguage = function (cultureName) {
                    for (var i = 0; i < self.LanguageList().length; i++)
                        if (self.LanguageList()[i].ID == cultureName) {
                            self.SelectedLanguage(self.LanguageList()[i]);
                            break;
                        }
                };
            }
            //
            self.AfterRender = function () {
                var cbLanguage = $('#profile').find('.combobox');
                if (cbLanguage.length > 0) {
                    var waitProcess = function () {
                        if (cbLanguage.outerHeight(false) == 0)
                            return false;
                        //
                        showSpinner(cbLanguage[0]);
                        $.when(self.LanguageListD).done(function () {
                            hideSpinner(cbLanguage[0]);
                        });
                        return true;
                    };
                    var wait = function () {
                        if (!waitProcess())
                            setTimeout(wait, 100);
                    };
                    wait();
                }
            };
            self.Load = function () {
                var ajaxControl = new ajaxLib.control();
                ajaxControl.Ajax(null,
                    {
                        dataType: 'json',
                        url: 'accountApi/GetUserSettings',
                        method: 'GET'
                    },
                    function (response) {
                        self.setting = response;
                        //
                        $.when(self.LanguageListD).done(function () {
                            self.SetSelectedLanguage(self.setting.CultureName);
                        });
                        self.IncomingCallProcessing(self.setting.IncomingCallProcessing);
                        self.UseCompactMenuOnly(self.setting.UseCompactMenuOnly);
                        //
                        self.ListView_CompactMode(self.setting.ListView_CompactMode);
                        self.ListView_GridLines(self.setting.ListView_GridLines);
                        self.ListView_Multicolor(self.setting.ListView_Multicolor);
                    });
                //              
                self.LoadLanguageList();
                //
                self.LoadDeputy();
            }
            //
            self.ajaxControl_save = new ajaxLib.control();
            self.Save = function (reloadPage) {
                if (self.ajaxControl_save.IsAcitve() == true) {
                    setTimeout(function () { self.Save(reloadPage); }, 500);
                    return;
                }
                //
                self.ajaxControl_save.Ajax($('#profile'),
                    {
                        url: 'accountApi/SetUserSettings',
                        method: 'POST',
                        data: self.setting
                    },
                    function (response) {
                        if (response != 0) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('AjaxError') + '\n[ProfileSettings.js, Save]', 'error');
                            });
                        }
                        else if (reloadPage == true) {
                            showSpinner();
                            window.location.reload(true);
                        }
                    });
            };
            //
            {//IncomingCallProcessing 
                self.IncomingCallProcessing = ko.observable(null);
                self.IncomingCallProcessing.subscribe(function (newValue) {
                    if (self.setting != null) {
                        if (self.setting.IncomingCallProcessing == newValue)
                            return;
                        self.setting.IncomingCallProcessing = newValue;
                        self.Save(false);
                    }
                });
            }
            //
            {//UseCompactMenuOnly
                self.UseCompactMenuOnly = ko.observable(null);
                self.UseCompactMenuOnly.subscribe(function (newValue) {
                    if (self.setting != null) {
                        if (self.setting.UseCompactMenuOnly == newValue)
                            return;
                        self.setting.UseCompactMenuOnly = newValue;
                        self.Save(true);
                    }
                });
                self.ClickUseCompactMenuOnly = function () {
                    self.UseCompactMenuOnly(!self.UseCompactMenuOnly());
                };
            }
            //           
            {//listView settings
                self.ListView_CompactMode = ko.observable(false);
                self.ListView_CompactMode.subscribe(function (newValue) {
                    if (self.setting != null) {
                        if (self.setting.ListView_CompactMode == newValue)
                            return;
                        self.setting.ListView_CompactMode = newValue;
                        self.Save(false);
                    }
                });
                //
                self.ListView_GridLines = ko.observable(false);
                self.ListView_GridLines.subscribe(function (newValue) {
                    if (self.setting != null) {
                        if (self.setting.ListView_GridLines == newValue)
                            return;
                        self.setting.ListView_GridLines = newValue;
                        self.Save(false);
                    }
                });
                //
                self.ListView_Multicolor = ko.observable(false);
                self.ListView_Multicolor.subscribe(function (newValue) {
                    if (self.setting != null) {
                        if (self.setting.ListView_Multicolor == newValue)
                            return;
                        self.setting.ListView_Multicolor = newValue;
                        self.Save(false);
                    }
                });
            }
            //
            {//reset settings
                self.ajaxControl_resetSettings = new ajaxLib.control();
                self.ResetUserSettingsClick = function () {
                    require(['sweetAlert'], function () {
                        swal({
                            title: getTextResource('ResetUserSettings'),
                            text: getTextResource('ResetUserSettingsQuestion'),
                            showCancelButton: true,
                            closeOnConfirm: false,
                            closeOnCancel: true,
                            confirmButtonText: getTextResource('ButtonOK'),
                            cancelButtonText: getTextResource('ButtonCancel')
                        },
                        function (value) {
                            if (value == true) {
                                showSpinner();
                                self.ajaxControl_resetSettings.Ajax(null,
                                    {
                                        url: 'accountApi/ResetUserSettings',
                                        method: 'POST'
                                    },
                                    function (response) {
                                        hideSpinner();
                                        swal({
                                            title: getTextResource('ResetUserSettings'),
                                            text: getTextResource('ResetUserSettingsCompleted'),
                                            type: 'info'
                                        },
                                        function (value) {
                                            showSpinner();
                                            window.location.reload(true);
                                        });
                                    },
                                    function () {
                                        hideSpinner();
                                        swal(getTextResource('ResetUserSettings'), getTextResource('AjaxError') + '\n[ProfileSettings.js, ResetUserSettingsClick]', 'error');
                                    });
                            }
                        });
                    });
                };
            }
            //
            {
                self.Deputy = ko.observable(null);
                self.LoadDeputy = function () {
                    require(['models/Account/DeputyTable'], function (vm) {
                        var mod = new vm.ViewModel();
                        self.Deputy(mod);
                        mod.Load();
                    });
                }
            }
        }
    }
    return module;
});
