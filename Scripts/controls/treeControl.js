define(['knockout', 'jquery', 'ajax'], function (ko, $, ajaxLib) {
    var module = {
        control: function (template) {
            template = template || 'Navigator/TreeControl';
            var self = this;
            self.Template = template;
            self.$region = null;//set in init
            self.type = null;//set in init, BLL.Navigator.NavigatorTypes
            self.$isLoaded = $.Deferred();
            self.divID = 'treeControl_' + ko.getNewID();
            self.firstNodes = ko.observableArray([]);
            //смотри дефаулт конфиг для комментов
            self.ShowCheckboxes = ko.observable(false);//у навигатора два режима работы: 1. без чекбоксов, тогда можно выбрать только один узел; 2. с чекбоксами, тогда можно выбрать несколько узлов.
            self.DownloadAllLevels = ko.observable(false);
            self.AvailableClassArray = ko.observable(null);
            self.UseAccessIsGranted = ko.observable(true);
            self.OperationsID = ko.observable(null);
            self.ClickableClassArray = ko.observable([]);
            self.FinishClassArray = ko.observable([]);
            self.AllClickable = ko.observable(false);
            self.ClickFunction = null;
            self.Title = ko.observable('');
            self.TitleStyle = ko.observable('');
            self.WindowModeEnabled = ko.observable(false);
            self.OnlyTwoState = ko.observable(false);
            self.AvailableCategoryID = ko.observable(null);
            self.UseRemoveCategoryClass = ko.observable(null);
            self.RemovedCategoryClassArray = ko.observable([]);
            self.AvailableTypeID = ko.observable(null);
            self.AvailableTemplateClassID = ko.observable(null);
            self.AvailableTemplateClassArray = ko.observable([]);
            self.HasLifeCycle = ko.observable(true);
            self.ExpandFirstNodes = ko.observable(false);
            self.DontLoadWhenInit = ko.observable(false);
            self.StopDownload = ko.observable(false);
            self.RushFunction = null;
            self.AllLevelDownloaded = ko.observable(false);
            self.CustomControlObjectID = ko.observable(null);
            self.SetCustomControl = ko.observable(null);
            self.SetTransferOwner = ko.observable(null);
            self.ExpandFirstLevel = ko.observable(false);
            self.ContextMenu = ko.observable(null);
            self.IsContextMenuEnabled = ko.observable(true);
            //
            self.TitleBlockVisible = ko.computed(function () {
                if (!self.Title())
                    return false;
                //
                return true;
            });
            self.HeaderExpanded = ko.observable(false);
            self.IsShowTree = ko.computed(function () {
                if (!self.TitleBlockVisible())
                    return true;
                //
                return self.HeaderExpanded();
            });
            self.CollapseExpandHeader = function () {
                self.HeaderExpanded(!self.HeaderExpanded());
            };
            //
            self.SelectedNode = ko.observable(null);
            self.SelectedNode.subscribe(function () {
                var contextMenuViewModel = self.ContextMenu();
                if (contextMenuViewModel != null && contextMenuViewModel.isVisible)
                    contextMenuViewModel.close();
            });

            //
            self.ajaxControl_load = new ajaxLib.control();
            self.ajaxControl_loadPath = new ajaxLib.control();
            self.Load = function () {
                var retD = $.Deferred();
                //
                var data = {
                    ID: null,
                    ClassID: null,
                    AvailableClassID: self.AvailableClassArray(),//тут не нужен, но хуже не будет
                    UseAccessIsGranted: self.UseAccessIsGranted(),//тут не нужен, но хуже не будет
                    OperationsID: self.OperationsID() ? self.OperationsID() : [],//тут не нужен, но хуже не будет
                    Type: self.type,
                    AvailableCategoryID: self.AvailableCategoryID() ? self.AvailableCategoryID() : null,
                    UseRemoveCategoryClass: self.UseRemoveCategoryClass() != null ? self.UseRemoveCategoryClass() : null,
                    RemovedCategoryClassArray: self.RemovedCategoryClassArray() ? self.RemovedCategoryClassArray() : [],
                    AvailableTypeID: self.AvailableTypeID() ? self.AvailableTypeID() : null,
                    AvailableTemplateClassID: self.AvailableTemplateClassID() ? self.AvailableTemplateClassID() : null,
                    AvailableTemplateClassArray: self.AvailableTemplateClassArray() ? self.AvailableTemplateClassArray() : [],
                    HasLifeCycle: self.HasLifeCycle(),
                    CustomControlObjectID: self.CustomControlObjectID() ? self.CustomControlObjectID() : null,
                    SetCustomControl: self.SetCustomControl() !== null ? self.SetCustomControl() : null,
                    SetTransferOwner: self.SetTransferOwner() !== null ? self.SetTransferOwner() : null
                };
                if (self.StopDownload() == true) {
                    retD.resolve();
                }
                self.ajaxControl_load.Ajax(self.$region,
                    {
                        dataType: "json",
                        method: 'GET',
                        data: data,
                        url: 'navigatorApi/GetTreeNodes'
                    },
                    function (newVal) {
                        if (self.StopDownload() == true) {
                            retD.resolve();
                        }
                        if (newVal && newVal.Result === 0) {
                            var list = newVal.List;
                            if (list) {
                                ko.utils.arrayForEach(list, function (el) {
                                    var newNode = new module.treeNode(el, null, self);
                                    self.firstNodes.push(newNode);
                                });
                                //
                                self.OpenFirstNode(retD);
                            }
                        }
                        else if (newVal && newVal.Result === 1)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[treeControl.js, Load]', 'error');
                            });
                        else if (newVal && newVal.Result === 2)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[treeControl.js, Load]', 'error');
                            });
                        else if (newVal && newVal.Result === 3)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[treeControl.js, Load]', 'error');
                            });
                    });
                //
                return retD.promise();
            };
            //
            self.OpenFirstNode = function (retD) {
                var nodes = self.firstNodes();
                if (!nodes || self.DontLoadWhenInit() == true) {
                    retD.resolve();
                    return;
                }
                //
                if (self.type === 2 || self.ExpandFirstLevel() == true || self.ExpandFirstNodes() == true || self.ShowCheckboxes() == true)//ProductCatalogue or configured
                {
                    var node = nodes[0];
                    if (node) {
                        $.when(self.OpenCloseClick(node)).done(function () {
                            if (self.ShowCheckboxes() == true && self.DownloadAllLevels() == true)
                            {
                                $.when(self.DownloadAllNodes(node)).done(function () {
                                    self.AllLevelDownloaded(true);
                                    if (self.ExpandFirstNodes() == true) {
                                        var inNodes = node.Nodes().slice();
                                        var expandAction = null;
                                        expandAction = function () {
                                            if (inNodes.length > 0) {
                                                $.when(self.OpenCloseClick(inNodes[0])).done(function () {
                                                    inNodes.splice(0, 1);
                                                    expandAction();
                                                });
                                            }
                                            else
                                                retD.resolve();
                                        };
                                        expandAction();
                                    }
                                    else
                                        retD.resolve();
                                });
                            }
                            else {
                                self.AllLevelDownloaded(true);
                                if (self.ExpandFirstNodes() == true) {
                                    var nodes = node.Nodes().slice();
                                    var expandAction = null;
                                    expandAction = function () {
                                        if (nodes.length > 0) {
                                            $.when(self.OpenCloseClick(nodes[0])).done(function () {
                                                nodes.splice(0, 1);
                                                expandAction();
                                            });
                                        }
                                        else
                                            retD.resolve();
                                    };
                                    expandAction();
                                }
                                else
                                    retD.resolve();
                            }
                        });
                    }
                    else
                        retD.resolve();
                }
                else
                    retD.resolve();
            };
            //
            self.DownloadAllNodes = function (node, el) {
                if (self.StopDownload() == true) {
                    return;
                }
                var retDD = $.Deferred();
                $.when(self.StartRushFunction()).done(function () {
                    self.RushFunction = null;
                    var t = node.Nodes();
                    if (t)
                    {
                        if (t.length == 0) {
                            retDD.resolve();
                            return;
                        }
                        if (!el)
                            el = 0;
                        var test = t[el];
                    }
                    $.when(self.OpenCloseClick(test)).done(function () {
                        $.when(self.DownloadAllNodes(test)).done(function () {
                            test.IsExpanded(false);
                            if (el != t.length - 1)
                                $.when(self.DownloadAllNodes(node, el + 1)).done(function () {
                                    retDD.resolve();
                                });
                            else
                                retDD.resolve();
                        });
                    });
                })
                return retDD.promise();
            };

            self.StartRushFunction = function () {
                if (self.RushFunction != null) {
                    var retDDD = $.Deferred();
                    self.RushFunction(retDDD);
                    return retDDD.promise();
                }
            }

            self.OpenCloseClickFromHtml = function (node, e) {
                if (!node)
                    return;
                //
                var isClickFromInput = e.target.tagName.toLowerCase() == 'input';
                //
                if (!isClickFromInput)
                    self.OpenCloseClick(node);
                //
                return true;
            };
            //
            self.OpenCloseClick = function (node) {
                var retD = $.Deferred();
                //
                if (!node || node.CanContainsSubNodes() == false) {
                    retD.resolve();
                    return retD.promise();
                }
                //
                if (node.IsLoaded() || node.IsExpanded()) {
                    node.IsExpanded(!node.IsExpanded());
                    retD.resolve();
                    return retD.promise();
                }
                //
                var data = {
                    ID: node.ID,
                    ClassID: node.ClassID,
                    AvailableClassID: self.AvailableClassArray(),
                    UseAccessIsGranted: self.UseAccessIsGranted(),
                    OperationsID: self.OperationsID() ? self.OperationsID() : [],
                    Type: self.type,
                    AvailableCategoryID: self.AvailableCategoryID() ? self.AvailableCategoryID() : null,
                    UseRemoveCategoryClass: self.UseRemoveCategoryClass() != null ? self.UseRemoveCategoryClass() : null,
                    RemovedCategoryClassArray: self.RemovedCategoryClassArray() ? self.RemovedCategoryClassArray() : [],
                    AvailableTypeID: self.AvailableTypeID() ? self.AvailableTypeID() : null,
                    AvailableTemplateClassID: self.AvailableTemplateClassID() ? self.AvailableTemplateClassID() : null,
                    AvailableTemplateClassArray: self.AvailableTemplateClassArray() ? self.AvailableTemplateClassArray() : [],
                    HasLifeCycle: self.HasLifeCycle(),
                    CustomControlObjectID: self.CustomControlObjectID() ? self.CustomControlObjectID() : null,
                    SetCustomControl: self.SetCustomControl() !== null ? self.SetCustomControl() : null,
                    SetTransferOwner: self.SetTransferOwner() !== null ? self.SetTransferOwner() : null
                };
                if (self.StopDownload() == true) {
                    retD.resolve();
                }
                self.ajaxControl_load.Ajax(self.$region,
                    {
                        dataType: "json",
                        method: 'GET',
                        data: data,
                        url: 'navigatorApi/GetTreeNodes'
                    },
                    function (newVal) {
                        if (self.StopDownload() == true) {
                            retD.resolve();
                        }
                        if (newVal && newVal.Result === 0) {
                            var list = newVal.List;
                            if (list) {
                                //
                                if (list.length == 0)
                                    node.CanContainsSubNodes(false);
                                else ko.utils.arrayForEach(list, function (el) {
                                    if (node.CheckedState() == module.checkedStates.Checked)
                                        el.Checked = true;
                                    //
                                    var newNode = new module.treeNode(el, node, self);
                                    if (self.FinishClassArray().indexOf(newNode.ClassID) != -1)
                                        newNode.CanContainsSubNodes(false);
                                    //
                                    node.Nodes.push(newNode);
                                });
                            }
                            else node.CanContainsSubNodes(false);
                            //
                            node.IsLoaded(true);
                            node.IsExpanded(!node.IsExpanded());
                        }
                        else if (newVal && newVal.Result === 1)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[treeControl.js, OpenCloseClick]', 'error');
                            });
                        else if (newVal && newVal.Result === 2)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[treeControl.js, OpenCloseClick]', 'error');
                            });
                        else if (newVal && newVal.Result === 3)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[treeControl.js, OpenCloseClick]', 'error');
                            });
                        //
                        retD.resolve();
                    });
                //
                return retD.promise();
            };
            //
            self.OpenToNode = function (nodeID, nodeClassID, RushDownload) {
                var retD = $.Deferred();
                //
                if (RushDownload) {
                    var tmp = RushDownload;
                } else {
                    var tmp = self.$isLoaded;
                }

                $.when(tmp).done(function () {
                    var data = {
                        id: nodeID,
                        classID: nodeClassID,
                        type: self.type
                    };
                    self.ajaxControl_loadPath.Ajax(self.$region,
                        {
                            dataType: "json",
                            method: 'GET',
                            data: data,
                            url: 'navigatorApi/GetPathToNode'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var list = newVal.List;
                                if (list && list.length > 0) {
                                    var searchingArray = self.firstNodes();
                                    recursiveNodeOpener(list, self.firstNodes(), retD);
                                }
                                else retD.resolve(null);
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[treeControl.js, OpenToNode]', 'error');
                                    retD.resolve(null);
                                });
                            else if (newVal && newVal.Result === 2)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[treeControl.js, OpenToNode]', 'error');
                                    retD.resolve(null);
                                });
                            else if (newVal && newVal.Result === 3)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                    retD.resolve(null);
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[treeControl.js, OpenToNode]', 'error');
                                    retD.resolve(null);
                                });
                        });
                });
                //
                return retD.promise();
            };
            var recursiveNodeOpener = function (serverArray, clientArray, retD) {
                var serverNode = serverArray.pop();
                if (!serverNode) {
                    retD.resolve(null);
                    return;
                }
                //
                var clientNode = ko.utils.arrayFirst(clientArray, function (el) {
                    return el.ID.toLowerCase() == serverNode.ID.toLowerCase();
                });
                //
                if (!clientNode) {
                    retD.resolve(null);
                    return;
                }
                //
                if (!clientNode.IsExpanded()) {
                    $.when(self.OpenCloseClick(clientNode)).done(function () {
                        if (clientNode.Nodes().length > 0 && serverArray.length > 0)
                            recursiveNodeOpener(serverArray, clientNode.Nodes(), retD);
                        else retD.resolve(clientNode);
                    });
                }
                else if (clientNode.Nodes().length > 0 && serverArray.length > 0)
                    recursiveNodeOpener(serverArray, clientNode.Nodes(), retD);
                else retD.resolve(clientNode);
            };
            //
            self.IsSelected = function (node) {
                if (!node)
                    return false;
                //
                if (self.SelectedNode()) {
                    if (node.ID == self.SelectedNode().ID && node.ClassID == self.SelectedNode().ClassID)
                        return true;
                }
                //
                if (node.IsSelected())
                    return true;
                //
                return false;
            };
            //
            self.IsClickable = function (node) {
                if (!node || self.ClickableClassArray().length == 0)
                    return false;
                //
                var exist = ko.utils.arrayFirst(self.ClickableClassArray(), function (el) {
                    return el == node.ClassID;
                });
                //
                if (exist)
                    return true;
                //
                return false;
            };
            //
            self.ClickNode = function (node) {
                if (!node || !self.ClickFunction)
                    return;
                //
                var nodeInfo = node.GetInfo();
                //
                if (self.AllClickable() == true) {
                    if (self.ClickFunction(nodeInfo))
                        self.SelectedNode(node);
                    return;
                }
                //
                var exist = ko.utils.arrayFirst(self.ClickableClassArray(), function (el) {
                    return el == node.ClassID;
                });
                if (exist) {
                    if (self.ShowCheckboxes()) {
                        node.SetCheckStateByClick();
                        self.IsSelected(node);
                        //
                        if (self.ClickFunction) self.ClickFunction(nodeInfo);
                    }
                    else if (self.ClickFunction(nodeInfo))
                        self.SelectedNode(node);
                    //
                    return;
                }
            };
            //
            self.SelectNode = function (node) {
                if (node) {
                    if (self.ShowCheckboxes()) {
                        node.CheckedState(module.checkedStates.Checked);
                        self.IsSelected(node);
                        //
                        if (self.ClickFunction) self.ClickFunction(node);
                    }
                    else
                        self.SelectedNode(node);
                    //
                    if (node.domElement() != null) {
                        node.domElement().scrollIntoView(false);
                    }
                }
            };
            self.DeselectNode = function () {
                self.SelectedNode(null);
            };
            //
            self.TakeCssNode = function (node) {
                if (!node || !node.IconClass)
                    return '';
                //
                var retval = node.IconClass;
                if (self.IsSelected(node))
                    retval += ' ' + 'active';
                //
                return retval;
            };
            //
            self.GetAllCheckedNodes = function (classID) {
                if (!self.ShowCheckboxes())
                    return null;
                //
                var recursiveGetter = function (nodeCollection) {
                    var retval = [];
                    //
                    if (!nodeCollection || nodeCollection.length == 0)
                        return retval;
                    //
                    ko.utils.arrayForEach(nodeCollection, function (node) {
                        if (node) {
                            if (node.CheckedState() == module.checkedStates.Checked && (node.ClassID === classID || !classID))
                                retval.push(node.GetInfo());
                            //
                            if (node.Nodes && node.Nodes() && node.CheckedState() !== module.checkedStates.Unchecked)
                                retval = retval.concat(recursiveGetter(node.Nodes()));
                        }
                    });
                    //
                    return retval;
                };
                //
                return recursiveGetter(self.firstNodes());
            };
            self.UncheckAllNodes = function () {
                if (!self.ShowCheckboxes())
                    return null;
                //
                ko.utils.arrayForEach(self.firstNodes(), function (node) {
                    if (node && node.CheckedState() != module.checkedStates.Unchecked)
                        node.CheckedState(module.checkedStates.Unchecked); //recursive go down
                });
            };
            //
            self.defaultConfig = {
                AvailableClassArray: [],//массив классИД, которые будут загружаться, если null - то все
                UseAccessIsGranted: true,//передаем на запросы узлов и не выдаем те, к которым у текущего пользователя не будет доступа
                OperationsID: [], //передаем на запросы узлов и не возвращаем узлы с такими пользователями, у которых нет этих операций (используется далеко не везде)
                //
                onClick: null,//функция для вызова при клике на элементе дерева для выбора, возвращает true если узел должен быть "выбран"
                ClickableClassArray: [],//классИД, которые будут с курсором-выбора
                AllClickable: false,//передавать ли в функцию выбора строчку не из предыдущего списка
                //
                ShowCheckboxes: false, //очевидно, даем или нет возможность выбора в дереве
                DownloadAllLevels: false, //загрузить все уровни дерева, действует только с ShowCheckboxes=true
                OnlyTwoState: false, //возможно только два состояния для ClickableClassArray, если true.
                FinishClassArray: [], //массив классов, которые по умолчанию считаются пустыми,
                Title: '', //заголовок
                TitleStyle: 'treeControlHeader-default', //стиль заголовка,
                WindowModeEnabled: false, //кнопка открыть в новом окне
                //
                AvailableCategoryID: null,//ProductCatalogCategoryID, используется в навигаторе по каталогу продуктов. если задано, то доступна лишь эта категория 

                UseRemoveCategoryClass: null,//Если RemovedCategoryClassArray задан, а тажке UseRemoveCategoryClass не null то используется. Если true исключить категории вывод, если false то игнорировать.
                RemovedCategoryClassArray: [], //ProductCatalogCategoryIDs, используется в навигаторе по каталогу продуктов. если задано, то доспна или исключается лишь эта категория (массив  категорий)
                AvailableTypeID: null, //ProductCatalogTemplateID, используется в навигаторе по каталогу продуктов. если задано, то доступен лишь этот тип 
                AvailableTemplateClassID: null, //ProductCatalogTemplate, ClassID, используется в навигаторе по каталогу продуктов. если задано, то доступны лишь типы с этим классом 
                AvailableTemplateClassArray: [], //ProductCatalogTemplate, ClassID, используется в навигаторе по каталогу продуктов. если задано, то доступны лишь типы с этимим классами
                HasLifeCycle: true, //типы, имующие ЖЦ
                //
                CustomControlObjectID: null, //используется в навигаторе по оргструктуре. используется для отображения пользователей, у которых данный объект стоит на контроле
                SetCustomControl: null, //используется в навигаторе по оргструктуре. если true (ставим на контроль), то показываем лишь организации и подразделения внутри которых есть пользователи. если false (снимаем с контроля), то показываем лишь организации и подразделения, внутри которых есть пользователи у которых CustomControlObjectID стоит на контроле
                SetTransferOwner: null,// используется в навигаторе при множественной передаче заявок
                //
                ExpandFirstNodes: false,//раскрыть владельца и организации (рекурсивно)
                ExpandFirstLevel: false,//раскрыть только первый уровень
                DontLoadWhenInit: false,//не грузить список при инициализации
                StopDownload: false,
                RushFunction: null, //срочная функция, тормозит открытие всех нод
                AllLevelDownloaded: false,
                ContextMenu: null,
                IsContextMenuEnabled: true
            };
            //
            self.init = function ($region, type, settings) {
                self.$region = $region;
                self.type = type;
                var config = self.defaultConfig;
                $.extend(config, settings);
                //
                self.AvailableClassArray(config.AvailableClassArray);
                self.UseAccessIsGranted(config.UseAccessIsGranted);
                self.OperationsID(config.OperationsID);
                self.ClickableClassArray(config.ClickableClassArray);
                self.OnlyTwoState(config.OnlyTwoState);
                self.FinishClassArray(config.FinishClassArray);
                self.ShowCheckboxes(config.ShowCheckboxes);
                self.DownloadAllLevels(config.DownloadAllLevels);
                self.AllClickable(config.AllClickable);
                self.ClickFunction = config.onClick;
                self.Title(config.Title);
                self.TitleStyle(config.TitleStyle);
                self.WindowModeEnabled(config.WindowModeEnabled);
                self.AvailableCategoryID(config.AvailableCategoryID);
                self.RemovedCategoryClassArray(config.RemovedCategoryClassArray);
                self.UseRemoveCategoryClass(config.UseRemoveCategoryClass);
                self.AvailableTypeID(config.AvailableTypeID);
                self.AvailableTemplateClassID(config.AvailableTemplateClassID);
                self.AvailableTemplateClassArray(config.AvailableTemplateClassArray);
                self.HasLifeCycle(config.HasLifeCycle);
                self.ExpandFirstNodes(config.ExpandFirstNodes);
                self.CustomControlObjectID(config.CustomControlObjectID);
                self.SetCustomControl(config.SetCustomControl);
                self.SetTransferOwner(config.SetTransferOwner);
                self.ExpandFirstLevel(config.ExpandFirstLevel);
                self.DontLoadWhenInit(config.DontLoadWhenInit);
                self.StopDownload(config.StopDownload);
                self.AllLevelDownloaded(config.AllLevelDownloaded);
                self.RushFunction = config.RushFunction;

                self.ContextMenu(config.ContextMenu);
                self.IsContextMenuEnabled(config.IsContextMenuEnabled);
                //
                self.$region.append('<div id="' + self.divID + '" style="position:relative" data-bind="template: {name: \'' + self.Template + '\', afterRender: AfterRender}" ></div>');
                //
                try {
                    ko.applyBindings(self, document.getElementById(self.divID));
                }
                catch (err) {
                    console.log(err);
                    if (document.getElementById(self.divID))
                        throw err;
                }
            };
            //
            self.ClearTreeControl = function () {
                ko.cleanNode(document.getElementById(self.divID));
                document.getElementById(self.divID).parentNode.removeChild(document.getElementById(self.divID));

            };
            self.NewWindowButtonVisible = ko.computed(function () {
                return self.WindowModeEnabled() && self.IsShowTree();
            });
            self.ShowInNewWindow = function (windowCaption) {
                if (!self.WindowModeEnabled())
                    return;
                //
                require(['usualForms'], function (fhMod) {
                    var fh = new fhMod.formHelper(true);
                    var options = {
                        TreeType: self.type,
                        onClick: self.ClickFunction,
                        Title: '',
                        TitleStyle: '',
                        ShowCheckboxes: self.ShowCheckboxes(),
                        DownloadAllLevels: self.DownloadAllLevels(),
                        OnlyTwoState: self.OnlyTwoState(),
                        UseAccessIsGranted: self.UseAccessIsGranted(),
                        AvailableClassArray: self.AvailableClassArray(),
                        ClickableClassArray: self.ClickableClassArray(),
                        AllClickable: self.AllClickable(),
                        FinishClassArray: self.FinishClassArray(),
                        OperationsID: self.OperationsID(),
                        AvailableCategoryID: self.AvailableCategoryID(),
                        UseRemoveCategoryClass: self.UseRemoveCategoryClass(),
                        RemovedCategoryClassArray: self.RemovedCategoryClassArray(),
                        AvailableTypeID: self.AvailableTypeID(),
                        AvailableTemplateClassID: self.AvailableTemplateClassID(),
                        AvailableTemplateClassArray: self.AvailableTemplateClassArray(),
                        HasLifeCycle: self.HasLifeCycle(),
                        ExpandFirstNodes: self.ExpandFirstNodes(),
                        CustomControlObjectID: self.CustomControlObjectID(),
                        SetCustomControl: self.SetCustomControl(),
                        SetTransferOwner: self.SetTransferOwner(),
                        ExpandFirstLevel: self.ExpandFirstLevel(),
                        DontLoadWhenInit: self.DontLoadWhenInit(),
                        StopDownload: self.StopDownload(),
                        AllLevelDownloaded: self.AllLevelDownloaded(),
                        RushFunction: self.RushFunction,
                        ContextMenu: self.ContextMenu(),
                        IsContextMenuEnabled: self.IsContextMenuEnabled(),
                    };
                    fh.ShowTreeControlAtWindow(options, self.firstNodes(), self.SelectedNode(), function (selectedNode) {
                        self.SelectedNode(selectedNode);
                    }, windowCaption);
                });
            };
            //
            self.AfterRender = function () {
                $.when(self.Load()).done(function () {
                    var chekedNodes = self.GetAllCheckedNodes();
                    var elem = document.getElementsByClassName('btnVisibility');
                    if (elem.length > 0) {
                        if (self.ShowCheckboxes()) {
                            if (chekedNodes.length > 0)
                                elem[0].style.visibility = 'visible';
                            else
                                elem[0].style.visibility = 'hidden';
                        }
                        else {
                            if (self.SelectedNode())
                                elem[0].style.visibility = 'visible';
                            else
                                elem[0].style.visibility = 'hidden';
                        }
                    }
                    self.$isLoaded.resolve();
                });
            };
            self.ContextMenuRequested = function (node, e) {
                if (!node || !self.IsContextMenuEnabled()) return true;

                self.ClickNode(node);

                if (self.SelectedNode() != node) return true;

                if (self.showContextMenu(e)) {
                    e.preventDefault();
                    return false;
                }

                return true;
            };
            self.showContextMenu = function (e) {
                var contextMenuViewModel = self.ContextMenu();
                if (contextMenuViewModel != null)
                    return contextMenuViewModel.show(e);
                else
                    return false;
            };
            //
            self.findNodeWithParent = function (node, nodeID, nodeClassID) {
                var childNodes = !node ? self.firstNodes() : node.IsLoaded() ? node.Nodes() : null;

                if (!childNodes) {
                    return null;
                }

                for (var i = 0; i < childNodes.length; i++) {
                    var childNode = childNodes[i];

                    if (childNode.ID.toUpperCase() === nodeID.toUpperCase() && childNode.ClassID == nodeClassID) {
                        return {
                            parent: node,
                            node: childNode
                        };
                    }

                    var foundNode = self.findNodeWithParent(childNode, nodeID, nodeClassID);
                    if (foundNode) {
                        return foundNode;
                    }
                }

                return null;
            };
            //
            self.refresh = function (nodeID, nodeClassID) {
                var nodeWithParent = self.findNodeWithParent(null, nodeID, nodeClassID);

                if (!nodeWithParent) retD.resolve();

                var parent = nodeWithParent.parent;
                var node = nodeWithParent.node;

                //
                // обновляем измененую ноду и её родительскую ноду

                return self.refreshNode(node).then(function () { self.refreshNode(parent); });
            };
            self.refreshNode = function (node) {
                var retD = $.Deferred();
                //
                var data = {
                    ID: node && node.ID,
                    ClassID: node && node.ClassID,
                    AvailableClassID: self.AvailableClassArray(),
                    UseAccessIsGranted: self.UseAccessIsGranted(),
                    OperationsID: self.OperationsID() ? self.OperationsID() : [],
                    Type: self.type,
                    AvailableCategoryID: self.AvailableCategoryID() ? self.AvailableCategoryID() : null,
                    UseRemoveCategoryClass: self.UseRemoveCategoryClass() != null ? self.UseRemoveCategoryClass() : null,
                    RemovedCategoryClassArray: self.RemovedCategoryClassArray() ? self.RemovedCategoryClassArray() : null,
                    AvailableTypeID: self.AvailableTypeID() ? self.AvailableTypeID() : null,
                    AvailableTemplateClassID: self.AvailableTemplateClassID() ? self.AvailableTemplateClassID() : null,
                    AvailableTemplateClassArray: self.AvailableTemplateClassArray() ? self.AvailableTemplateClassArray() : [],
                    HasLifeCycle: self.HasLifeCycle()
                };
                self.ajaxControl_load.Ajax(self.$region,
                    {
                        dataType: "json",
                        method: 'GET',
                        data: data,
                        url: 'navigatorApi/GetTreeNodes'
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            var list = newVal.List;

                            if (list == null || list.length == 0) {
                                node && node.CanContainsSubNodes(false);
                                node && node.Nodes([]);
                            } else {
                                if (!!node) {
                                    // Удаляем ноды которых больше нет
                                    node.Nodes(ko.utils.arrayFilter(node.Nodes(), function (childNode) {
                                        var existingChildNode = ko.utils.arrayFirst(list, function (el) {
                                            return childNode.ID.toUpperCase() === el.ID.toUpperCase() && childNode.ClassID === el.ClassID;
                                        });
                                        return !!existingChildNode;
                                    }));

                                    // Обновляем существующие ноды, добавляем новые
                                    ko.utils.arrayForEach(list, function (el) {
                                        var existingChildNode = ko.utils.arrayFirst(node.Nodes(), function (childNode) {
                                            return childNode.ID.toUpperCase() === el.ID.toUpperCase() && childNode.ClassID === el.ClassID;
                                        });

                                        if (!existingChildNode) {
                                            // новая запись
                                            if (node.CheckedState() == module.checkedStates.Checked)
                                                el.Checked = true;
                                            //
                                            var newNode = new module.treeNode(el, node, self);
                                            if (self.FinishClassArray().indexOf(newNode.ClassID) != -1)
                                                newNode.CanContainsSubNodes(false);
                                            //
                                            node.Nodes.push(newNode);
                                        } else {
                                            existingChildNode.Name = el.Name;
                                            existingChildNode.ObservableName(el.Name);
                                            existingChildNode.Location = el.Location;
                                        }
                                    });

                                    node.CanContainsSubNodes(true);
                                } else {
                                    var firstNodes = self.firstNodes();
                                    if (list.length == firstNodes.length) {
                                        for (var i = 0; i < list.length; i++) {
                                            firstNodes[i].Name = list[i].Name;
                                            firstNodes[i].ObservableName(list[i].Name);
                                            firstNodes[i].Location = list[i].Location;
                                        }
                                    }
                                }
                            }
                        }
                        else if (newVal && newVal.Result === 1)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[treeControl.js, OpenCloseClick]', 'error');
                            });
                        else if (newVal && newVal.Result === 2)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[treeControl.js, OpenCloseClick]', 'error');
                            });
                        else if (newVal && newVal.Result === 3)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[treeControl.js, OpenCloseClick]', 'error');
                            });
                        //
                        retD.resolve();
                    });
                //
                return retD.promise()
            }
        },
        windowModel: function (settings, regionID) {
            var self = this;
            self.LoadD = $.Deferred();
            self.$region = $('#' + regionID);
            self.Options = settings;
            self.controlTree = null;
            //
            self.CollapseAll = function () {
                if (!self.controlTree)
                    return;
                //
                var recursiveCollapser = function (nodeCollection) {
                    if (!nodeCollection || nodeCollection.length == 0)
                        return;
                    //
                    ko.utils.arrayForEach(nodeCollection, function (node) {
                        if (node) {
                            if (node.Nodes && node.Nodes())
                                recursiveCollapser(node.Nodes());
                            //
                            if (node.IsExpanded())
                                node.IsExpanded(false);
                        }
                    });
                };
                //
                recursiveCollapser(self.controlTree.firstNodes());
            };
            //
            self.ExpandAll = function () {
                //пока не реализуем
            };
            //
            self.DeselectAll = function () {
                if (self.controlTree)
                    self.controlTree.UncheckAllNodes();
            };
            //
            self.DeselectAllVisible = ko.observable(self.Options.ShowCheckboxes === true);
            //
            self.init = function () {
                var retD = $.Deferred();
                //
                var $regionTree = self.$region.find('.treeControlWindow-tree');
                $regionTree.empty();
                self.controlTree = new module.control();
                self.controlTree.init($regionTree, self.Options.TreeType, {
                    onClick: self.Options.onClick ? self.Options.onClick : null,
                    Title: self.Options.Title ? self.Options.Title : '',
                    TitleStyle: self.Options.TitleStyle ? self.Options.TitleStyle : 'treeControlHeader-default',
                    ShowCheckboxes: self.Options.ShowCheckboxes === true ? true : false,
                    DownloadAllLevels: self.Options.DownloadAllLevels === true ? true : false,
                    OnlyTwoState: self.Options.OnlyTwoState === true ? true : false,
                    UseAccessIsGranted: self.Options.UseAccessIsGranted === true ? true : false,
                    AvailableClassArray: self.Options.AvailableClassArray ? self.Options.AvailableClassArray : [],
                    ClickableClassArray: self.Options.ClickableClassArray ? self.Options.ClickableClassArray : [],
                    AllClickable: self.Options.AllClickable === true ? true : false,
                    FinishClassArray: self.Options.FinishClassArray ? self.Options.FinishClassArray : [],
                    OperationsID: self.Options.OperationsID ? self.Options.OperationsID : [],
                    WindowModeEnabled: false,
                    AvailableCategoryID: self.AvailableCategoryID,
                    UseRemoveCategoryClass: self.Options.UseRemoveCategoryClass != null ? self.Options.UseRemoveCategoryClass : null,
                    RemovedCategoryClassArray: self.Options.RemovedCategoryClassArray ? self.Options.RemovedCategoryClassArray : [],
                    AvailableTypeID: self.AvailableTypeID,
                    AvailableTemplateClassID: self.AvailableTemplateClassID,
                    AvailableTemplateClassArray: self.AvailableTemplateClassArray,
                    HasLifeCycle: self.Options.HasLifeCycle === false ? false : true,
                    ExpandFirstNodes: self.Options.ExpandFirstNodes,
                    CustomControlObjectID: self.CustomControlObjectID,
                    SetCustomControl: self.SetCustomControl,
                    SetTransferOwner: self.SetTransferOwner,
                    ExpandFirstLevel: self.Options.ExpandFirstLevel,
                    DontLoadWhenInit: self.Options.DontLoadWhenInit,
                    StopDownload: self.Options.StopDownload,
                    AllLevelDownloaded: self.Options.AllLevelDownloaded,
                    RushFunction: self.Options.RushFunction ? self.Options.RushFunction : null
                });
                //
                $.when(self.controlTree.$isLoaded).done(function () {
                    retD.resolve();
                });
                //
                return retD.promise();
            };
            self.SetRootValues = function (rootTreeValues) {
                if (rootTreeValues && self.controlTree)
                    self.controlTree.firstNodes(rootTreeValues);
            };
            self.SetSelected = function (currentNode, callback) {
                self.controlTree.SelectedNode(currentNode);
                self.controlTree.SelectedNode.subscribe(function (node) {
                    if (callback)
                        callback(node);
                });
            };
            //
            self.AfterRender = function () {
                $.when(self.init()).done(function () {
                    self.LoadD.resolve();
                });
            };
        },
        checkedStates: {
            Checked: true,
            Unchecked: false,
            PartialChecked: null
        },
        treeNode: function (data, parentNode, treeControl) {
            var self = this;
            var parent = parentNode;
            //
            self.ID = data.ID;
            self.Name = data.Name;
            self.ObservableName = ko.observable(data.Name);
            self.ClassID = data.ClassID;
            self.TemplateID = data.TemplateID;
            self.IconClass = data.IconClass;
            self.Location = data.Location;
            self.domElement = ko.observable(null);
            //
            self.GetInfo = function () {
                return {
                    ID: self.ID,
                    Name: self.Name,
                    ClassID: self.ClassID,
                    TemplateID: self.TemplateID,
                    Location: self.Location,
                    IconClass: self.IconClass,
                    Checked: self.CheckedState()
                }
            };
            //
            self.CanContainsSubNodes = ko.observable(data.CanContainsSubNodes);
            self.VisibleCheckBox = ko.observable();
            if (treeControl.ShowCheckboxes() == true)
                self.VisibleCheckBox(true);
            else self.VisibleCheckBox(false);
            self.CanContainsSubNodes.subscribe(function (newValue) {
                if (treeControl.ShowCheckboxes() == false) {
                    self.VisibleCheckBox(false);
                    return;
                }
                var clickableArray = treeControl.ClickableClassArray();
                if (clickableArray.indexOf(self.ClassID) != -1 || self.CanContainsSubNodes()) {
                    self.CheckedState(true);
                    return;
                }
                if (treeControl.ShowCheckboxes() == true) {
                    self.VisibleCheckBox(true);
                    return;
                }
                self.VisibleCheckBox(false);
            });
            self.IsLoaded = ko.observable(data.IsLoaded);
            //
            self.CheckedState = ko.observable();
            if (data.Checked === true)
                self.CheckedState(module.checkedStates.Checked);
            else self.CheckedState(module.checkedStates.Unchecked);
            //
            self.SetCheckStateByClick = function () {
                if (self.CheckedState() != module.checkedStates.Checked)
                    self.CheckedState(module.checkedStates.Checked);
                else
                    self.CheckedState(module.checkedStates.Unchecked);
            };
            //
            self.BlockChildsUpdate = false;
            self.CheckedState.subscribe(function (newValue) {
                var clickableArray = treeControl.ClickableClassArray();
                //
                if (treeControl.DontLoadWhenInit() && newValue == module.checkedStates.Checked && !self.IsLoaded()) {
                    $.when(treeControl.OpenCloseClick(self)).done(function () {
                        $.when(treeControl.DownloadAllNodes(self)).done(function () {
                            self.CheckedState(newValue);
                        });
                        self.IsLoaded(true);
                    });
                }
                //
                if (treeControl.OnlyTwoState()) {
                    if (clickableArray.indexOf(self.ClassID) != -1 && newValue == module.checkedStates.PartialChecked) {
                        self.CheckedState(module.checkedStates.Unchecked);
                        return;
                    }
                }
                //
                if (!self.BlockChildsUpdate && newValue != module.checkedStates.PartialChecked && self.IsLoaded() && self.Nodes().length > 0)
                    ko.utils.arrayForEach(self.Nodes(), function (el) {
                        el.CheckedState(newValue);
                    });
                //
                if (parent && parent.CheckChildsState)
                    parent.CheckChildsState();
                //
                var elem = document.getElementsByClassName('btnVisibility');
                if (elem.length > 0) {
                    var chekedNodesCount = treeControl.GetAllCheckedNodes();
                    var visible = false;
                    ko.utils.arrayForEach(chekedNodesCount, function (el) {
                        if (clickableArray.indexOf(el.ClassID) != -1)
                            visible = true;
                    });
                    if (visible)
                        elem[0].style.visibility = 'visible';
                    else
                        elem[0].style.visibility = 'hidden';
                }
                treeControl.IsSelected(self);
            });
            //
            self.IsSelected = function () {
                return self.CheckedState() == module.checkedStates.Checked;
            };
            //
            self.CheckChildsState = function () {
                var checkedState = 'not set';
                var isMixed = false;
                //
                var nodes = self.Nodes();
                if (nodes.length == 0)
                    return;
                if (nodes.length == 1)
                    checkedState = nodes[0].CheckedState();
                else {
                    ko.utils.arrayForEach(self.Nodes(), function (node) {
                        if (checkedState == 'not set') {
                            checkedState = node.CheckedState();
                            return;
                        }
                        //
                        if (checkedState !== node.CheckedState())
                            isMixed = true;
                    });
                }
                //
                self.BlockChildsUpdate = true;
                if (isMixed)
                    self.CheckedState(module.checkedStates.PartialChecked);
                else if (checkedState != self.CheckedState())
                    self.CheckedState(checkedState);
                //
                self.BlockChildsUpdate = false;
            };
            //
            self.Nodes = ko.observableArray([]);
            if (data.Nodes) {
                ko.utils.arrayForEach(data.Nodes, function (el) {
                    if (self.CheckedState() == module.checkedStates.Checked)
                        el.Checked = true;
                    //
                    var newNode = new module.treeNode(el, null, self);
                    self.Nodes.push(newNode);
                });
                self.CheckChildsState();
            }
            //
            self.IsExpanded = ko.observable(false);
            //
            self.SubListVisible = ko.computed(function () {
                if (!self.CanContainsSubNodes())
                    return false;
                //
                if (!self.IsLoaded() || self.Nodes().length <= 0)
                    return false;
                //
                return true;
            });
        }
    }
    return module;
});