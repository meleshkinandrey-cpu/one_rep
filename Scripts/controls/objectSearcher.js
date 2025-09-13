define(['jquery', 'ajax', 'knockout', 'usualForms', 'jqueryUI', 'jqueryMouseWheel'], function ($, ajaxLib, ko, formHelperLib) {
    var module = {
        //объект jQuery input, string название искалки, string название шаблона искалки, [] параметры конструктора для искалки, function(objectInfo) действие выбора найденного объекта, function() действие сброса значения, function() действие закрытия искалки, deferred ожидание перед загрузкой, игнорировать очищение при пустом поле ввода
        control: function (obj, searcherName, searcherTemplateName, searcherParams, selectAction, resetAction, closeAction, dLoad, clearOnEmptyIgnore) {
            if (!searcherTemplateName)
                searcherTemplateName = 'SearchControl/SearchTextFieldControl';
            if (!searcherParams)
                searcherParams = [];
            if (!resetAction)
                resetAction = function () {
                    obj.val('');
                };
            if (!closeAction)
                closeAction = function (selectedItem) { };
            //
            var self = this;
            if (!$.objectSearcherList)
                $.objectSearcherList = [];
            //
            self.uniqueID = ko.getNewID();
            //
            self.Items = ko.observableArray([]);//finded object list
            self.PreservedItems = ko.observableArray([]);//finded object list copy, use in tagEditor
            var createItem = function (objectInfo) {
                var thisObj = this;
                //
                thisObj.htmlID = objectInfo.ID + '_' + self.uniqueID;
                thisObj.ID = objectInfo.ID;
                thisObj.ClassID = objectInfo.ClassID;
                thisObj.FullName = objectInfo.FullName;
                thisObj.Details = objectInfo.Details;
                thisObj.Info = objectInfo.Info;
                //
                if (objectInfo.PositionName && objectInfo.SubdivisionName) {
                    thisObj.PositionName = objectInfo.PositionName;
                    thisObj.SubdivisionName = objectInfo.SubdivisionName;
                }
                //
                thisObj.Click = function () {
                    self.SelectedItem(thisObj);
                    selectAction(thisObj);
                    self.Close(false);
                };
            };
            self.SelectedItem = ko.observable(null);
            self.SelectedItem.subscribe(function (newValue) {
                if (newValue == null && !obj.is(':focus'))
                    closeAction(null);
            });
            self.NotFoundVisible = ko.observable(false);
            self.SearchingVisible = ko.observable(false);
            self.VeryShortText = ko.observable(false);
            self.SearchingErrorVisible = ko.observable(false);
            self.EraseTextClick = function () {
                self.ajaxControl.Abort();
                self.SelectedItem(null);
                resetAction();
            }
            //
            //
            self.searcherDivID = searcherName + '_' + self.uniqueID;
            self.eraserDivID = 'eraser_' + self.searcherDivID;
            self.ajaxControl = new ajaxLib.control();
            self.fhControl = new formHelperLib.formHelper();
            self.showChecker = null;
            //
            self.LoadD = $.Deferred();
            self.Load = function () {
                if (!obj.attr('maxlength'))
                    obj.attr('maxlength', 250);
                //
                var parent = obj.parent();
                parent.css('position', 'relative');
                parent.append('<div id="' + self.eraserDivID + '" class="search-results-control-clearfield cursor-pointer" data-bind="click: EraseTextClick, visible: ReadOnly() == false" />');
                $('#controlsContainer').append('<div id="' + self.searcherDivID + '" data-bind="template: {name: \'' + searcherTemplateName + '\', afterRender: AfterRender}" style="display:none;position:absolute;z-index:1000;"></div>');//body of searcher
                //
                self.LifetimeChecker();//автоматическое удаление контейнера-результатов поиска, когда пропадет obj
                //
                var sElem = document.getElementById(self.searcherDivID);
                try {
                    ko.applyBindings(self, sElem);
                }
                catch (err) {
                    if (sElem)
                        throw err;
                }
                //
                var eElem = document.getElementById(self.eraserDivID);
                try {
                    ko.applyBindings(self, eElem);
                }
                catch (err) {
                    if (eElem)
                        throw err;
                }
            };
            self.lifetimeInterval = null;
            self.LifetimeChecker = function () {
                self.lifetimeInterval = setInterval(function () {
                    if ($(obj.selector).length == 0) {
                        clearInterval(self.lifetimeInterval);
                        self.Remove();
                    }
                }, 1000);
            };
            self.AfterRender = function () {
                var searchAction = function () {
                    var searchText = obj.val();
                    self.search(searchText, false);
                    self.Show();
                }
                obj.click(searchAction);
                //obj.blur(function (e) {
                //    setTimeout(function () {
                //        if (document.activeElement == obj[0])
                //            return;
                //        else if (document.activeElement == self.getDIV().find('.scrollBar')[0]) {
                //            obj.focus();
                //            return;
                //        }
                //        self.Close();
                //    }, 200);//TODO: ko click invokes after blur
                //});
                ko.utils.registerEventHandler(document, "mousedown", function (e) {
                    if (obj.has(e.target).length > 0)
                        return;//click on input
                    if (self.getDIV().find('.scrollBar').has(e.target).length > 0 || //content of menu
                        self.getDIV().find('.scrollBar').is(e.target)) { //scroll
                        obj.focus();
                        return;//click on dropDownMenuItem
                    }
                    if (self.getDIV().has(e.target).length > 0 && e.target.className.indexOf('ui-button') != -1) {
                        obj.focus();
                        return;//click on button in dropDownMenu
                    }
                    //
                    self.Close();
                });
                obj.keydown(function (e) {
                    if (e.keyCode == 27) { //Esc
                        if (self.getDIV().css('display') == 'none')
                            return;
                        self.Close();
                        e.stopPropagation();
                    }
                    if (e.keyCode == 9) { //tab
                        if (self.getDIV().css('display') == 'none')
                            return;
                        self.Close();
                    }
                    else if (e.keyCode == 37 || e.keyCode == 39)
                        e.stopPropagation();
                    else if (e.keyCode == 38) { //up
                        if (self.Items().length > 0) {
                            if (!self.SelectedItem())
                                self.SelectedItem(self.Items()[0]);
                            else {
                                var index = self.Items().indexOf(self.SelectedItem());
                                if (index > 0)
                                    self.SelectedItem(self.Items()[index - 1]);
                            }
                            self.scrollToSelectedObject();
                        }
                        e.stopPropagation();
                    }
                    else if (e.keyCode == 40) { //down
                        if (self.Items().length > 0) {
                            if (!self.SelectedItem())
                                self.SelectedItem(self.Items()[0]);
                            else {
                                var index = self.Items().indexOf(self.SelectedItem());
                                if (index < self.Items().length - 1)
                                    self.SelectedItem(self.Items()[index + 1]);
                            }
                        }
                        else if (self.PreservedItems().length > 0) {
                            var searchText = obj.val();
                            self.search(searchText, false);
                        }
                        self.scrollToSelectedObject();
                        e.stopPropagation();
                    }
                    else if (e.keyCode == 33) { //pageUp
                        if (self.Items().length > 0) {
                            if (!self.SelectedItem())
                                self.SelectedItem(self.Items()[0]);
                            else {
                                var index = self.Items().indexOf(self.SelectedItem());
                                if (index > 0)
                                    self.SelectedItem(self.Items()[Math.max(index - 5, 0)]);
                            }
                            self.scrollToSelectedObject();
                        }
                        e.stopPropagation();
                    }
                    else if (e.keyCode == 34) { //pageDown
                        if (self.Items().length > 0) {
                            if (!self.SelectedItem())
                                self.SelectedItem(self.Items()[0]);
                            else {
                                var index = self.Items().indexOf(self.SelectedItem());
                                if (index < self.Items().length - 1)
                                    self.SelectedItem(self.Items()[Math.min(index + 5, self.Items().length - 1)]);
                            }
                        }
                        self.scrollToSelectedObject();
                        e.stopPropagation();
                    }
                    else if (e.keyCode == 36) { //home
                        if (self.Items().length > 0)
                            self.SelectedItem(self.Items()[0]);
                        self.scrollToSelectedObject();
                        e.stopPropagation();
                    }
                    else if (e.keyCode == 35) { //end
                        if (self.Items().length > 0)
                            self.SelectedItem(self.Items()[self.Items().length - 1]);
                        self.scrollToSelectedObject();
                        e.stopPropagation();
                    }
                    else if (e.keyCode == 13) { //enter
                        if (self.VeryShortText() == true)
                            self.SearchImmediately();
                        else if (self.SelectedItem())
                            self.SelectedItem().Click();
                        e.stopPropagation();
                    }
                });
                obj.keyup(function (e) {
                    if (e.keyCode == 27 || e.keyCode == 13 || e.keyCode == 9)
                        return;
                    else if (e.keyCode == 38 || e.keyCode == 40 || e.keyCode == 33 || e.keyCode == 34 || e.keyCode == 36 || e.keyCode == 35 || e.keyCode == 37 || e.keyCode == 39) {
                        self.Show();
                        return;
                    }
                    searchAction();
                });
                obj.bind('paste', null, function (e) {
                    setTimeout(searchAction, 200);
                });
                obj.mousewheel(function () {
                    if (obj.is(':focus'))
                        searchAction();
                });
                //
                self.LoadD.resolve();
            };
            //            
            //
            self.CurrentUserID = null;//если меняется, то поиск пойдет от имени этого пользователя
            self.ReadOnly = ko.observable(false);
            self.Remove = function () {
                self.Close(false);
                //
                var searcherDiv = $('#' + self.searcherDivID);
                if (searcherDiv.length > 0) {
                    ko.cleanNode(searcherDiv[0]);
                    searcherDiv.remove();
                }
                //
                var eraserDiv = $('#' + self.eraserDivID);
                if (eraserDiv.length > 0) {
                    ko.cleanNode(eraserDiv[0]);
                    eraserDiv.remove();
                }
                //
                obj.focus(null);
                obj.blur(null);
                obj.keydown(null);
                obj.keyup(null);
                obj.unbind('paste');
                obj.mousewheel(null);
                //
                if ($.objectSearcherList) {
                    var index = $.objectSearcherList.indexOf(self);
                    if (index > -1)
                        $.objectSearcherList.splice(index, 1);
                }
            };
            self.Close = function (closeActionEnabled) {
                var div = self.getDIV();
                if (div.length == 0 || div.css('display') == 'none')
                    return;
                //
                div.css('display', 'none');
                //
                if (document.activeElement == div.find('.scrollBar')[0])
                    obj.focus();
                //
                if (obj.val() == '' && self.SelectedItem() != null && !clearOnEmptyIgnore) {
                    self.ajaxControl.Abort();
                    self.SelectedItem(null);
                    resetAction();
                    //
                    return;
                }
                //
                if (closeActionEnabled != false)
                    closeAction(self.SelectedItem());
            };
            self.Show = function () {
                //нужно закрыть все другие искалки
                if ($.objectSearcherList)
                    for (var i = 0; i < $.objectSearcherList.length; i++)
                        if ($.objectSearcherList[i] != self)
                            $.objectSearcherList[i].Close();
                //
                var offset = obj.offset();
                //
                var div = self.getDIV();
                div.css('left', offset.left + 'px');
                div.css('top', offset.top + obj.outerHeight() + 'px');
                div.css('width', obj.outerWidth() + 'px');
                div.css('display', 'block');
            };
            self.SetSelectedItem = function (id, classID, fullName, details, info) {
                if (id && classID && fullName) {
                    var objectInfo = {
                        ID: id,
                        ClassID: classID,
                        FullName: fullName,
                        Details: details,
                        Info: info
                    };
                    var item = new createItem(objectInfo);
                    //
                    self.Items.removeAll();
                    self.Items.push(item);
                    self.Items.valueHasMutated();
                    //
                    self.SelectedItem(item);
                    self.NotFoundVisible(false);
                    self.SearchingVisible(false);
                    self.VeryShortText(false);
                    //
                    self.syncSearchText = fullName;
                }
                else {
                    self.Items.removeAll();
                    self.Items.valueHasMutated();
                    //
                    self.SelectedItem(null);
                    self.NotFoundVisible(true);
                    self.SearchingVisible(false);
                    self.VeryShortText(false);
                    //
                    self.syncSearchText = null;
                }
            };
            self.SetSearcherName = function (value) {
                searcherName = value;
            };
            self.SetSearchParameters = function (params) {
                self.Items.removeAll();
                self.syncSearchText = null;
                self.syncSearchFirstTime = true;
                //
                searcherParams = params;
            };
            self.ClearValues = function () {
                self.Items.removeAll();
                self.PreservedItems.removeAll();
                self.syncSearchText = null;
                self.syncSearchFirstTime = true;
            };
            //
            self.getDIV = function () {
                var retval = $('#' + self.searcherDivID);
                return retval;
            };
            //
            self.itemEval = function () {//func to override
                return true;
            };
            //
            self.scrollToSelectedObject = function () {
                if (self.SelectedItem())
                    self.fhControl.ScrollTo(self.getDIV().find('.scrollBar'), $('#' + self.SelectedItem().htmlID));
            };
            //
            self.SearchImmediately = function () {
                var searchText = obj.val();
                self.search(searchText, true);
                self.Show();
            };
            //
            self.syncSearchDate = null;
            self.syncTimeout = null;
            self.syncSearchText = null;
            self.syncSearchFirstTime = true;
            self.search = function (searchText, skipTextLength) {
                self.NotFoundVisible(false);
                self.SearchingErrorVisible(false);
                self.VeryShortText(false);
                self.SearchingVisible(false);
                //
                var retvalD = $.Deferred();
                if (self.syncSearchText == searchText && self.syncSearchFirstTime == false) {
                    retvalD.resolve();
                    return;
                }
                else if (searchText.trim().length < 5 && skipTextLength == false) {
                    self.VeryShortText(true);
                    retvalD.resolve();
                    return;
                }
                //
                self.SearchingVisible(true);
                //
                self.Items.removeAll();
                self.Items.valueHasMutated();
                //
                var dt = (new Date()).getTime();
                self.syncSearchDate = dt;
                self.syncSearchText = searchText;
                //
                if (self.syncTimeout)
                    clearTimeout(self.syncTimeout);
                self.syncTimeout = setTimeout(function () {
                    if (dt == self.syncSearchDate && searchText == self.syncSearchText) {
                        var d = self.searchPrivate(searchText);
                        $.when(d).done(function () {
                            self.syncSearchFirstTime = false;
                            retvalD.resolve();
                        });
                    }
                }, 500);
                //
                return retvalD.promise();
            };
            self.searchPrivate = function (searchText) {
                var retvalD = $.Deferred();
                self.ajaxControl.Ajax(null,
                    {
                        url: 'searchApi/search',
                        method: 'POST',
                        data: {
                            Text: encodeURIComponent(searchText.trim()),
                            TypeName: searcherName,
                            Params: ko.toJSON(searcherParams),//for post null params
                            CurrentUserID: self.CurrentUserID
                        }
                    },
                    function (response) {
                        if (response) {
                            var selectedItemFound = false;
                            self.Items.removeAll();
                            self.PreservedItems.removeAll();
                            response.forEach(function (item) {
                                if (!self.itemEval(item))
                                    return;//continue
                                var tmp = new createItem(item);
                                self.Items().push(tmp);
                                self.PreservedItems().push(tmp);
                                //
                                if (self.SelectedItem() && self.SelectedItem().ID == tmp.ID) {
                                    self.SelectedItem(tmp);//relink                           
                                    selectedItemFound = true;
                                }
                            });
                            if (!selectedItemFound)
                                self.SelectedItem(null);
                            self.Items.valueHasMutated();
                            self.NotFoundVisible(self.Items().length == 0);
                            self.SearchingVisible(false);
                            self.VeryShortText(false);
                            //auto select single value
                            if (!selectedItemFound && self.Items().length == 1 && searchText.trim() == self.Items()[0].FullName.trim())
                                self.SelectedItem(self.Items()[0]);
                        } else {
                            self.SelectedItem(null);
                            self.NotFoundVisible(true);
                            self.SearchingVisible(false);
                            self.VeryShortText(false);
                        }
                        retvalD.resolve();
                    },
                    function (error) {
                        self.SelectedItem(null);
                        self.NotFoundVisible(false);
                        self.SearchingVisible(false);
                        self.SearchingErrorVisible(true);
                        self.VeryShortText(false);
                        retvalD.resolve();
                    });
                return retvalD.promise();
            };
            //
            //
            showSpinner(obj.parent()[0]);//над input не отображается!
            if (!dLoad)
                self.Load();
            else
                $.when(dLoad).done(function () {
                    self.Load();
                });
            $.when(self.LoadD).done(function () {
                hideSpinner(obj.parent()[0]);
            });
            //
            if ($.objectSearcherList.indexOf(self) == -1)
                $.objectSearcherList.push(self);
        }
    }
    return module;
});