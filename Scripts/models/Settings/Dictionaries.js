define(['knockout', 'jquery', 'ajax', 'treeControl', 'ui_controls/ContextMenu/ko.ContextMenu'], function (ko, $, ajaxLib, treeLib) {
    var module = {
        modes: {// режимы: работы, отображения
            none: 'none',
            orgstructure: 'orgstructure' // Оргструктура
        },
        ViewModel: function () {//общая модель представления 
            var self = this;
            //
            self.ajaxControl = new ajaxLib.control();
            self.modes = module.modes;
            //
            self.SelectedViewMode = ko.observable(module.modes.none);//выбранное представление по умолчанию
            self.SelectedViewMode.subscribe(function (newValue) {
                if (newValue == self.modes.orgstructure && self.orgStructureControl == null) {
                    self.InitOrgStructureTree();
                }
            });
            self.Model = ko.observable(null);
            //            
            self.ModelAfterRender = function () {
                if (self.SelectedViewMode() == module.modes.none) {
                    self.SelectedViewMode(module.modes.orgstructure);
                }
                self.OnResize();
            };
            self.OpenOrgStructure = function () {
                self.SelectedViewMode(module.modes.orgstructure);
            };
            self.IsOrgStructureActive = ko.computed(function () {
                return self.SelectedViewMode() == module.modes.orgstructure;
            });
            //
            self.CheckData = function () {//вызывается извне, сообщает, что пора обновлять/загружать данные
                var activeMode = self.SelectedViewMode();

                if (activeMode  == self.modes.orgstructure && self.orgStructureControl == null) {
                    self.InitOrgStructureTree();
                }
            };
            {// оргструктура
                self.OrgStructureViewTemplateName = ko.observable(''); //шаблон контента (справа) 
                self.InitOrgStructureTree = function () {
                    self.orgStructureControl = new treeLib.control();
                    self.orgStructureControl.init($('#tabOrgStructure .dictionaries-orgstructure-tree'), 0, {
                        onClick: self.OnSelectOrgStructure,
                        ShowCheckboxes: false,
                        AvailableClassArray: [29, 101, 102], // 29 - Владелец, 101 - Организация, 102 - Подразделение
                        ClickableClassArray: [29, 101, 102],
                        AllClickable: false,
                        ExpandFirstLevel: true,
                        ContextMenu: self.treeControlContextMenu()
                    });

                    $.when(self.orgStructureControl.$isLoaded).done(function () {
                        // 
                    });
                };
                //
                self.OnSelectOrgStructure = function (node) {
                    var classID = self.getObjectClassID(node);
                    switch (classID) {
                        case 29: self.OrgStructureViewTemplateName("Settings/OwnerView");
                            break;
                        case 101: self.OrgStructureViewTemplateName("Settings/OrganizationView");
                            break;
                        case 102: self.OrgStructureViewTemplateName("Settings/SubdivisionView");
                            break;
                        default: 
                            self.OrgStructureViewTemplateName("");
                    } 
                    return true;
                };
                self.OnResize = function () {//чтобы была красивая прокрутка таблицы, а кнопки при этом оставались видны
                    // 
                };
                {//ko.contextMenu
                    self.treeControlContextMenu = ko.observable(null);
                    self.contextMenuInit = function (contextMenu) {
                        self.treeControlContextMenu(contextMenu);//bind contextMenu
                        //
                        contextMenu.clearItems();
                        // Редактировать (приводит карточку Владельца в режим редактирования)
                        self.editMenuItem(contextMenu, "EditOwnerMenuItem", 29, [1, 226]);
                        // Добавить организацию (открывает карточку Добавления Организации)
                        self.addMenuItem(contextMenu, "AddOrganizationMenuItem", 29, 101, [4]);
                        // Редактировать (приводит карточку Организации в режим редактирования)
                        self.editMenuItem(contextMenu, "EditOrganizationMenuItem", 101, [2, 227]);
                        // Удалить организацию (должно сопровождаться контрольным вопросом Вы действительно хотите безвозвратно удалить «Наименование организации» со всеми вложенными подразделениями ? Отмена - Да, см.картинку справа)
                        self.deleteMenuItem(contextMenu, "DeleteOrganizationMenuItem", 101, [3]);
                        // Добавить подразделение (открывает карточку Добавления Подразделения)
                        self.addMenuItem(contextMenu, "AddSubdivistionMenuItem", 101, 102, [7]);
                        // Редактировать (приводит карточку Владельца в режим редактирования)
                        self.editMenuItem(contextMenu, "EditSubdivistionMenuItem", 102, [5, 228]);
                        // Удалить подразделение (должно сопровождаться контрольным вопросом Вы действительно хотите безвозвратно удалить «Наименование подразделения» со всеми вложенными подразделениями ? Отмена - Да, см.картинку справа)
                        self.deleteMenuItem(contextMenu, "DeleteSubdivistionMenuItem", 102, [6]);
                        // Добавить подразделение (открывает карточку Добавления Подразделения)
                        self.addMenuItem(contextMenu, "AddSubdivistionMenuItem", 102, 102, [7]);
                    };
                    self.contextMenuOpening = function (contextMenu) {
                        contextMenu.items().forEach(function (item) {
                            if (item.isEnable && item.isVisible) {
                                item.enabled(item.isEnable());
                                item.visible(item.isVisible());
                            }
                        });
                        //
                        if (contextMenu.visibleItems().length == 0)
                            contextMenu.close();
                    };
                    self.editMenuItem = function (contextMenu, restext, classID, operations) {
                        var isEnable = function () {
                            return self.anyOperationIsGranted(operations);
                        };
                        var isVisible = function () {
                            //if (!self.anyOperationIsGranted(operations)) return false;

                            var selectedNode = self.orgStructureControl.SelectedNode()
                            return !!selectedNode && self.getObjectClassID(selectedNode) == classID;
                        };
                        var action = function () {
                            if (!self.anyOperationIsGranted(operations)) return false;

                            var selectedNode = self.orgStructureControl.SelectedNode()
                            if (!selectedNode || self.getObjectClassID(selectedNode) != classID) return false;

                            var id = self.getObjectID(selectedNode);
                            self.showObjectForm(classID, id);
                        };
                        //
                        var cmd = contextMenu.addContextMenuItem();
                        cmd.restext(restext);
                        cmd.isEnable = isEnable;
                        cmd.isVisible = isVisible;
                        cmd.click(action);
                    };
                    self.addMenuItem = function (contextMenu, restext, parentClassID, classID, operations) {
                        var isEnable = function () {
                            return self.anyOperationIsGranted(operations);
                        };
                        var isVisible = function () {
                            //if (!self.anyOperationIsGranted(operations)) return false;

                            var selectedNode = self.orgStructureControl.SelectedNode()
                            return !!selectedNode && self.getObjectClassID(selectedNode) == parentClassID;
                        };
                        var action = function () {
                            if (!self.anyOperationIsGranted(operations)) return false;

                            var selectedNode = self.orgStructureControl.SelectedNode()
                            if (!selectedNode || self.getObjectClassID(selectedNode) != parentClassID) return false;

                            var parentID = self.getObjectID(selectedNode);
                            self.showChildObjectForm(classID, parentID);
                        };
                        //
                        var cmd = contextMenu.addContextMenuItem();
                        cmd.restext(restext);
                        cmd.isEnable = isEnable;
                        cmd.isVisible = isVisible;
                        cmd.click(action);
                    };
                    self.deleteMenuItem = function (contextMenu, restext, classID, operations) {
                        var isEnable = function () {
                            return self.anyOperationIsGranted(operations);
                        };
                        var isVisible = function () {
                            //if (!self.anyOperationIsGranted(operations)) return false;

                            var selectedNode = self.orgStructureControl.SelectedNode()
                            return !!selectedNode && self.getObjectClassID(selectedNode) == classID;
                        };
                        var action = function () {
                            if (!self.anyOperationIsGranted(operations)) return false;

                            var selectedNode = self.orgStructureControl.SelectedNode()
                            if (!selectedNode) return false;

                            var objectClassID = self.getObjectClassID(selectedNode);
                            if (objectClassID != classID) return false;

                            var objectID = self.getObjectID(selectedNode);
                            var name = self.getObjectName(selectedNode);
                            var question = classID == 101
                                ? getTextResource('ConfirmRemoveOrganizationQuestion').replace('{0}', name)
                                : getTextResource('ConfirmRemoveSubdivisionQuestion').replace('{0}', name)
                            require(['sweetAlert'], function (swal) {
                                swal({
                                    title: getTextResource('RemovingOrgStructureNodeTitle'),
                                    text: question,
                                    showCancelButton: true,
                                    closeOnConfirm: false,
                                    closeOnCancel: true,
                                    confirmButtonText: getTextResource('ButtonOK'),
                                    cancelButtonText: getTextResource('ButtonCancel')
                                },
                                    function (value) {
                                        swal.close();
                                        //
                                        if (value == true) {
                                            var data = {
                                                'ObjectClassID': objectClassID,
                                                'ObjectID': objectID
                                            };
                                            self.ajaxControl.Ajax(null,
                                                {
                                                    dataType: "json",
                                                    method: 'POST',
                                                    data: data,
                                                    url: 'assetApi/RemoveOrgStructureObject'
                                                },
                                                function (res) {
                                                    if (res.Result == 0) {
                                                    }
                                                    else {
                                                        require(['sweetAlert'], function () {
                                                            swal(res.Message, '', 'info');
                                                        });
                                                    }
                                                    // Обновляем дерево с задержкой
                                                    self.orgStructureControl.refresh(objectID, objectClassID); 
                                                });
                                        }
                                    });
                            });
                        };
                        //
                        var cmd = contextMenu.addContextMenuItem();
                        cmd.restext(restext);
                        cmd.isEnable = isEnable;
                        cmd.isVisible = isVisible;
                        cmd.click(action);
                    };
                    {//splitter
                        self.minSplitterWidth = 200;
                        self.maxSplitterWidth = 700;
                        self.splitterDistance = ko.observable(300);
                        self.resizeSplitter = function (newWidth) {
                            if (newWidth && newWidth >= self.minSplitterWidth && newWidth <= self.maxSplitterWidth) {
                                self.splitterDistance(newWidth);
                            }
                        };
                    }
                }
                self.showObjectForm = function (classID, id) {
                    showSpinner();
                    require(['dictionariesForms'], function (module) {
                        var fh = new module.formHelper(true);
                        if (classID == 29) // Владелец
                            fh.ShowOwnerForm(id);
                        else if (classID == 101) // Организация
                            fh.ShowOrganizationForm(id);
                        else if (classID == 102) // Подразделение
                            fh.ShowSubdivistionForm(id);
                        else
                            hideSpinner();
                    });
                };
                self.showChildObjectForm = function (classID, parentID) {
                    showSpinner();
                    require(['dictionariesForms'], function (module) {
                        var fh = new module.formHelper(true);
                        if (classID == 101) // Организация
                            fh.ShowOrganizationForm(id, parentID);
                        else if (classID == 102) // Подразделение
                            fh.ShowSubdivistionForm(id, parentID);
                        else
                            hideSpinner();
                    });
                };
                self.dispose = function () {
                    if (self.treeControlContextMenu() != null)
                        self.treeControlContextMenu().dispose();
                    //TODO other fields and controls
                };
            }
            {//identification
                self.getObjectID = function (obj) {
                    return obj.ID.toUpperCase();
                };
                self.getObjectClassID = function (obj) {
                    return obj.ClassID;
                };
                self.getObjectName = function (obj) {
                    return obj.Name;
                };
            }
            {//granted operations
                self.grantedOperations = [];
                $.when(userD).done(function (user) {
                    self.grantedOperations = user.GrantedOperations;
                });
                self.operationIsGranted = function (operationID) {
                    for (var i = 0; i < self.grantedOperations.length; i++)
                        if (self.grantedOperations[i] === operationID)
                            return true;
                    return false;
                };
                self.anyOperationIsGranted = function (operationIDs) {
                    for (var i = 0; i < self.grantedOperations.length; i++)
                        if (operationIDs.includes(self.grantedOperations[i]))
                            return true;
                    return false;
                };
            }
        }
    }
    return module;
});
