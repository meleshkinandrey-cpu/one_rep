define(['knockout', 'jquery', 'ajax', 'ttControl'], function (ko, $, ajaxLib, tclib) {
    var module = {
        ViewModel: function () {
            var self = this;
            var $isLoaded = $.Deferred();
            //

            var dashboardTreeItem = function (treeItem, parentObject) {//treeItem is InfraManager.Web.DTL.Dashboards.DashboardTreeItem
                var kself = this;
                kself.Name = treeItem.Name;
                kself.ParentID = treeItem.parentID;
                kself.ID = treeItem.ID;
                kself.HasChilds = treeItem.HasChilds;
                kself.Deep = 0;
                kself.Parent = parentObject;
                kself.IsDashboard = treeItem.IsDashboard;
                kself.IsGuantt = treeItem.IsGuantt;
                if (parentObject != null)
                    kself.Deep = parentObject.Deep + 1;
                //
                kself.Expanded = ko.observable(false);
                kself.Selected = ko.observable(false);
                kself.innerList = ko.observableArray([]);
                kself.visibleList = ko.observableArray([]);
                //
                kself.CanExpand = ko.computed(function () {
                    if (!kself.Expanded() && kself.HasChilds)
                        return true;
                    return false;
                });
                //
                kself.ClickItem = function (item, event) {
                    if (self.currentItem() != null)
                        self.currentItem().Selected(false);
                    self.currentItem(kself);
                    kself.Selected(true);
                    if (kself.HasChilds) {
                        if (kself.Expanded()) {
                            kself.visibleList.removeAll();
                            kself.visibleList.valueHasMutated();
                            kself.Expanded(false);
                        }
                        else {
                            var retD = kself.Load($(event.target));
                            $.when(retD).done(function () {
                                kself.Expanded(true);
                            });
                        }
                    }
                    else if (kself.IsDashboard || kself.IsGuantt) {
                        hideSpinner($('.dashboardView__dashboard')[0]);
                        var retD = kself.Load($(event.target));
                        $.when(retD).done(function () {
                            kself.Expanded(false);
                        });
                    }
                };

                kself.Load = function ($target) {
                    var returnD = $.Deferred();
                    var ajaxControl = new ajaxLib.control();
                    //
                    if (kself.IsDashboard) {
                        module.DashboardLoad($target, '.dashboardView__dashboard', kself.ID);
                    }
                    else if (kself.IsGuantt) {
                        module.GuanttLoad();
                    }
                    else {
                        if (kself.innerList().length == 0) {
                            var param = {
                                parentID: kself.ID,
                            };
                            var ajaxSettings = {
                                dataType: "json",
                                method: 'GET',
                                url: 'sdApi/GetDashboardTreeItems?' + $.param(param)
                            };
                            ajaxControl.Ajax($target.parent(), ajaxSettings,
                                function (itemList) {
                                    if (itemList && itemList.length > 0) {
                                        itemList.forEach(function (el) {
                                            kself.innerList().push(new dashboardTreeItem(el, kself));
                                        });
                                        kself.innerList.sort(function (left, right) {
                                            return left.Name.toLowerCase() == right.Name.toLowerCase() ? 0 : (left.Name.toLowerCase() < right.Name.toLowerCase() ? -1 : 1);
                                        });
                                        kself.innerList().forEach(function (el) {
                                            kself.visibleList().push(el);
                                        });
                                        kself.visibleList.valueHasMutated();
                                    }
                                    returnD.resolve();
                                });
                        }
                        else {
                            kself.innerList().forEach(function (el) {
                                kself.visibleList().push(el);
                            });
                            kself.visibleList.valueHasMutated();
                        }
                    }
                }
                //
                kself.CheckShowTooltipMessage = function (data, event) {
                    if (data && event) {
                        var $this = $(event.currentTarget);
                        var className = $this[0].className;
                        var font = '';
                        var treeAreaWidth = 0;
                        if (className.indexOf("b-blueMenu__item-link") !== -1) {
                            font = "14px arial";
                            treeAreaWidth = $('.dashboard-folder-name').width();
                        }
                        else if (className.indexOf("b-blueMenu__item-subitem") !== -1) {
                            font = "12px arial";
                            treeAreaWidth = $this.find('.text-overflow-ellipsis').width() - data.Deep * 10;
                        }
                        //
                        var nameWidth = self.getTextWidth(kself.Name, font);//var nameWidth = $this.find('span:first').width(); not work for ie 10
                        //
                        if (nameWidth > treeAreaWidth) {
                            var ttcontrol = new tclib.control();
                            ttcontrol.init($this, { text: kself.Name, showImmediat: true, showTime: false });
                        }
                    }
                    return true;
                };
            }
            self.browser_ie11 = getIEVersion() == 11 ? true : false;
            self.getTextWidth = function getTextWidth(text, font) {
                // re-use canvas object for better performance
                var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
                var context = canvas.getContext("2d");
                context.font = font;
                var metrics = context.measureText(text);
                return metrics.width;
            };

            self.rootList = ko.observableArray([]);
            var guantt = { Name: "Диаграмма Ганта", IsGuantt: true };
            if (!self.browser_ie11) {
                self.rootList.push(new dashboardTreeItem(guantt, null));
            }
            
            self.NavigatorVisible = ko.observable(true);

            self.NavigatorVisible.subscribe(function (newVal) {
                var width = newVal ? 350 : 22;
                //
                $('.dashboardView__tree').width(width);
                $('.dashboardView__dashboard').css('left', width + 'px');
            });
            
            self.ShowNavigator = function () {
                self.NavigatorVisible(true);
            };

            self.HideNavigator = function () {
                self.NavigatorVisible(false);
            };
            self.Load = function () {
                var returnD = $.Deferred();
                $.when(userD).done(function (user) {
                    //
                    var ajaxControl = new ajaxLib.control();
                    //
                    var param = {
                        parentID: '',
                    };
                    var ajaxSettings = {
                        dataType: "json",
                        method: 'GET',
                        url: 'sdApi/GetDashboardTreeItems?' + $.param(param)
                    };
                    ajaxControl.Ajax(null, ajaxSettings,
                        function (_rootList) {
                            if (_rootList && _rootList.length > 0) {
                                _rootList.forEach(function (el) {
                                    self.rootList().push(new dashboardTreeItem(el, null));
                                });
                                self.rootList.sort(function (left, right) {
                                    return left.Name.toLowerCase() == right.Name.toLowerCase() ? 0 : (left.Name.toLowerCase() < right.Name.toLowerCase() ? -1 : 1);
                                });
                                self.rootList.valueHasMutated();
                            }
                            //
                            returnD.resolve();
                        });
                });
                return returnD.promise();
            };

            self.currentItem = ko.observable(null);
            //
            self.AfterRender = function () {
                $isLoaded.resolve();
            };
        },
        DashboardLoad: function ($target, styleClassName, dashboardID, onLoadFunc) {
            $.when(userD).done(function (user) {

                var url = location.href;
                url = (url.split('?')[1] ? url.split('?')[0] : url) + '?' + 'userID=' + user.UserID + '&dashboardID=' + dashboardID;
                window.history.pushState("", "", url);
                //
                var ajaxControl = new ajaxLib.control();
                var loadError = null;
                //
                var param = {
                    dashboardID: dashboardID,
                };
                var ajaxSettings = {
                    dataType: "json",
                    method: 'GET',
                    url: 'sdApi/getDashboardXmlData?' + $.param(param)
                };
                ajaxControl.Ajax(
                    $target.parent(),
                    ajaxSettings,
                    function (error) {
                        loadError = error;
                        //
                        if (loadError == null) {
                            var template = '<iframe class="dashboardViewerIframe" frameborder="0"></iframe>';
                            $(styleClassName).html(template);
                            self.$iframe = $(styleClassName).find('.dashboardViewerIframe');

                            if (onLoadFunc) {
                                onLoadFunc();
                            }
                            else {
                                self.$iframe.on('load', function () {
                                    try {
                                        var _document = self.$iframe[0].contentWindow.document;
                                        //
                                        _document.body.style.height = '100%';
                                        _document.forms[0].style.height = '100%';
                                        //
                                        var container = _document.getElementsByClassName('dxWindowsPlatform')[0];//'dxWindowsPlatform' - на chrome, win10. проверить для других браузеров.
                                        container.style.height = '100%';
                                        container.style.overflow = 'hidden';
                                        //
                                        _document.showObjectForm = function (objectClassID, objectID) {
                                            if (objectClassID == 701 || objectClassID == 119 || objectClassID == 702) {
                                                require(['sdForms'], function (fhModule) {
                                                    var fh = new fhModule.formHelper();
                                                    fh.ShowObjectForm(objectClassID, objectID);
                                                });
                                            }
                                            else if (objectClassID == 5 || objectClassID == 6 || objectClassID == 33 || objectClassID == 34) {
                                                showSpinner();
                                                //
                                                require(['assetForms'], function (module) {
                                                    var fh = new module.formHelper(true);
                                                    fh.ShowAssetForm(objectID, objectClassID);
                                                });
                                            }
                                        };
                                        //
                                        hideSpinner($(styleClassName)[0]);
                                    }
                                    catch (e) { };//TODO: убрать try catch. добавлено из-за использования iframe для диаграммы ганта
                                });
                            }

                            if (self.$iframe.length > 0) {
                                showSpinner($(styleClassName)[0]);
                                var u = getDashboardViewerUrl(user.UserID, dashboardID);
                                self.$iframe.attr('src', getDashboardViewerUrl(user.UserID, dashboardID));
                            }
                        }
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('UnableToLoad') + ' ' + getTextResource('Dashboard'), loadError, 'warning');
                            });
                    });
            });
        },
        GuanttLoad: function () {
            if (!self.$iframe || !self.$iframe.length) {
                var template = '<iframe class="dashboardViewerIframe" frameborder="0"></iframe>';
                var styleClassName = '.dashboardView__dashboard';
                $(styleClassName).html(template);
                self.$iframe = $(styleClassName).find('.dashboardViewerIframe');
            }
            //
            if (self.$iframe.length > 0) {
                var host = window.location.origin;

                var url = host + '/inframanager/UI/Lists/RFCGantt/index.html';
                self.$iframe.attr('src', url);
            }
        }
    }
    return module;
});