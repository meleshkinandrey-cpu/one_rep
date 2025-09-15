define(['knockout', 'jquery', 'ajax', 'ttControl', 'urlManager'], function (ko, $, ajaxLib, tclib, urlManager) {
    var module = {
        setParameters: function (values, raiseEvent) {//values - is object, сохранение в историю браузера значения url и изменение параметров url
            if (!values)
                return;
            //
            var params = urlManager.getQueryParams();
            var isChanged = false;
            for (var key in values) {
                var paramName = key;
                var paramValue = values[key];
                //
                if (params[paramName] != paramValue) {
                    params[paramName] = paramValue;
                    isChanged = true;
                }
            }
            //
            if (isChanged == true) {
                window.history.pushState(null, null, 'Asset/Settings' + urlManager.toQueryString(params));
                if (raiseEvent == undefined || raiseEvent == true)
                    $(document).trigger('settings_urlChanged', []);
            }
        },
        //
        modes: {// режимы: работы, отображения
            none: 'none',
            dictionaries: 'dictionaries' //справочники
        },
        param_mode: 'mode',
        //
        ViewModel: function () {
            var self = this;
            //
            self.modes = module.modes;
            self.Dictionaries = ko.observable(null); //модель табеля
            //
            self.ViewTemplateName = ko.observable(''); //шаблон контента (справа)            
            //
            self.SelectedViewMode = ko.observable(module.modes.none);//выбранное представление по умолчанию
            self.SelectedViewMode.subscribe(function (newValue) {
                var params = {};
                params[module.param_mode] = newValue;
                module.setParameters(params, false);
                //
                self.CheckData();
            });
            self.CheckMode = function () {//распознавание режима
                var mode = urlManager.getUrlParam(module.param_mode);
                var currentMode = self.SelectedViewMode().toLowerCase();
                //
                if (mode == module.modes.dictionaries.toLowerCase())
                    self.SelectedViewMode(module.modes.dictionaries);
                // другие режимы
                else
                    self.SelectedViewMode(module.modes.dictionaries); // режим по умолчанию
                //
                return (mode != currentMode);
            };
            //
            self.CheckData = function () {//загрузка / перезагрузка вкладки
                var activeMode = self.SelectedViewMode();
                var ss = function () { showSpinner($('.settingsModule')[0]); };
                var hs = function () { hideSpinner($('.settingsModule')[0]); };
                //
                if (activeMode == module.modes.dictionaries) {
                    if (self.Dictionaries() == null) {
                        ss();
                        
                        require(['models/Settings/Dictionaries'], function (vm) {
                            var mod = new vm.ViewModel(module, self.CheckData);
                            self.Dictionaries(mod);
                            mod.CheckData();
                            //
                            self.ViewTemplateName('Settings/Dictionaries');
                            hs();
                        });
                    }
                    else {
                        self.ViewTemplateName('Settings/Dictionaries');
                        self.Dictionaries().CheckData();
                    }
                }
                else
                    self.ViewTemplateName('');
            };
            //
            self.ShowDictionaries = function () {
                self.SelectedViewMode(module.modes.dictionaries);
            };
            self.IsDictionariesActive = ko.computed(function () {
                return self.SelectedViewMode() == module.modes.dictionaries;
            });
            self.AfterRenderMode = function () {
                self.CheckMode();
                self.onResize();
                $(window).resize(self.onResize);
                $('.settings-main').click(function (e) {//контекстные команды могут отобразится после клика на чекбоксе
                    if ($(e.target).is('input'))
                        self.onResize();
                });
            };
            self.Load = function () {//грузит глобальную информацию - сколько непрочитанных сообщений в сводном табеле и сколько сообщений в твоих табелях
                var loadD = $.Deferred();
                //
                return loadD.promise();
            };
            self.onResize = function (e) {
                var dictionaries = self.Dictionaries();
                if (dictionaries != null)
                    dictionaries.OnResize(e);
            };
            $(window).bind('settings_urlChanged', function () {//поменяется url (изменили режимы в модуле, ткнули куда-либо)
                if (self.CheckMode() == false)
                    self.CheckData();
            });
        }
    }
    return module;
});
