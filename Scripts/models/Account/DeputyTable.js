define(['knockout', 'jquery', 'ajax', 'urlManager','comboBox' ], function (ko, $, ajaxLib, urlManager) {
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
        },
        //
        modes: {// режимы: работы, отображения
            none: 'none',
            ideputyfor: 'ideputyfor', 
            mydeputies: 'mydeputies' 
        },
        param_mode: 'mode',
        param_tab: 'tab',
        ViewModel: function (userID, isUserSettings) {
            var self = this;
            //
            self.curUser = ko.observable(userID ? userID : null ); 
            self.availability = functionsAvailability;
            self.modes = module.modes;
            self.IDeputyFor = ko.observable(null); 
            self.MyDeputies = ko.observable(null); 
            self.IsUserSettings = ko.observable(isUserSettings == false ? false : true);
            self.DeputyText = ko.observable(self.IsUserSettings() ? getTextResource('DeputiesMyProfileSettings') : getTextResource('DeputiesSettings'))
            //
            self.ViewTemplateName = ko.observable(''); //шаблон контента (таб)            
            //
            self.SelectedViewMode = ko.observable(module.modes.none);//выбранное представление по умолчанию
            self.SelectedViewMode.subscribe(function (newValue) {
                var params = {};
                params[module.param_mode] = 'dictionaries';
                params[module.param_tab] = newValue;
                module.setParameters(params, false);
                //
                self.CheckData();
            });
            self.CheckMode = function () {//распознавание режима
                var mode = urlManager.getUrlParam(module.param_tab);
                var currentMode = self.SelectedViewMode().toLowerCase();
                //
                if (mode == module.modes.ideputyfor.toLowerCase())
                    self.SelectedViewMode(module.modes.ideputyfor);
                else if (mode == module.modes.mydeputies.toLowerCase())
                    self.SelectedViewMode(module.modes.mydeputies);
                else
                    self.SelectedViewMode(module.modes.ideputyfor); // режим по умолчанию
                //
                return (mode != currentMode);
            };
            //
            self.WithCompletedDeputy = ko.observable(get_cookie("CheckIMFinishDeputy")=="true" ? true : false);
            self.WithCompletedDeputy.subscribe(function (newValue) {               
                self.WithCompletedDeputy(newValue);   
                set_cookie("CheckIMFinishDeputy", newValue);
                self.CheckData();
            });                       
            //
            function set_cookie(name, value, exp_y, exp_m, exp_d, path, domain, secure) {
                var cookie_string = name + "=" + escape(value);

                if (exp_y) {
                    var expires = new Date(exp_y, exp_m, exp_d);
                    cookie_string += "; expires=" + expires.toGMTString();
                }

                if (path)
                    cookie_string += "; path=" + escape(path);

                if (domain)
                    cookie_string += "; domain=" + escape(domain);

                if (secure)
                    cookie_string += "; secure";

                document.cookie = cookie_string;
            };
            function get_cookie(cookie_name) {
                var results = document.cookie.match('(^|;) ?' + cookie_name + '=([^;]*)(;|$)');

                if (results) 
                    return (decodeURIComponent(results[2]));               
                else
                    return null;
            };
            //
            self.CheckData = function () {//загрузка / перезагрузка вкладки
                var activeMode = self.SelectedViewMode();
                var ss = function () { showSpinner($('.settingsModule')[0]); };
                var hs = function () { hideSpinner($('.settingsModule')[0]); };
                //
                self.ViewTemplateName('');
                if (activeMode == module.modes.ideputyfor) {
                        ss();

                        require(['ui_lists/Account/DeputyTools'], function (vm) {
                            var mod = new vm.ViewModel(self.WithCompletedDeputy(), vm.TableType.ideputyfor, self.curUser());
                            self.IDeputyFor(mod);
                            self.IDeputyFor().clearAllInfos();
                            //
                            self.ViewTemplateName('../UI/Lists/Account/DeputyTools');
                            self.ViewTemplateName.valueHasMutated();
                            hs();
                        });
                }
                else if (activeMode == module.modes.mydeputies) {
                        ss();

                        require(['ui_lists/Account/DeputyTools'], function (vm) {
                            var mod = new vm.ViewModel(self.WithCompletedDeputy(), vm.TableType.mydeputies, self.curUser());
                            self.MyDeputies(mod);
                            self.MyDeputies().clearAllInfos();
                            //
                            self.ViewTemplateName('../UI/Lists/Account/DeputyToolsSecondView');
                            self.ViewTemplateName.valueHasMutated();
                            hs();
                        });
                }
                else
                    self.ViewTemplateName('');
            };
            //
            self.ShowIDeputyFor = function () {
                self.SelectedViewMode(module.modes.ideputyfor);
            };
            self.ShowMyDeputies = function () {
                self.SelectedViewMode(module.modes.mydeputies);
            };
            self.IsIDeputyForActive = ko.computed(function () {
                return self.SelectedViewMode() == module.modes.ideputyfor;
            });
            self.IsMyDeputiesActive = ko.computed(function () {
                return self.SelectedViewMode() == module.modes.mydeputies;
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
            self.Deputy = ko.observable(null);
            self.ModelAfterRender = function () {
                if (self.SelectedViewMode() == module.modes.none) {
                    self.SelectedViewMode(self.IsUserSettings() == false ? module.modes.mydeputies: module.modes.ideputyfor);
                }
                self.OnResize();
            };
            self.Load = function () {
                var loadD = $.Deferred();
                //
                return loadD.promise();
            };
            self.OnResize = function (e) {
                var ideputyfor = self.IDeputyFor();
                if (ideputyfor != null)
                    ideputyfor.OnResize(e);
            };
        }
    }
    return module;
});