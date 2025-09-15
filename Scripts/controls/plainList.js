define(['knockout', 'jquery', 'ajax'], function (ko, $, ajaxLib) {
    var module = {
        control: function (template, dataSource, options) {
            var self = this;

            self.dataSource = dataSource;
            self.Template = template;
            self.$region = null;//set in init
            self.divID = 'list_' + ko.getNewID();
            self.ClickFunction = null;
            self.Title = ko.observable('');
            self.TitleStyle = ko.observable('');
            self.ContextMenu = ko.observable(null);
            self.IsContextMenuEnabled = ko.observable(true);

            self.Load = function () {
                return self.dataSource.load(self.$region);
            }
            //
            self.TitleBlockVisible = ko.computed(function () {
                if (!self.Title())
                    return false;
                //
                return true;
            });
            self.SelectedItem = ko.observable(null);
            self.SelectedItem.subscribe(function () {
                var contextMenuViewModel = self.ContextMenu();
                if (contextMenuViewModel != null && contextMenuViewModel.isVisible)
                    contextMenuViewModel.close();
            });

            self.IsSelected = function (item) {
                if (!item)
                    return false;
                //
                if (self.SelectedItem()) {
                    if (item[options.id] == self.SelectedItem()[options.id])
                        return true;
                }
                //
                return false;
            };
            //
            self.IsClickable = function (item) {
                return true;
            };
            //
            self.ClickItem = function (item) {
                if (!item || !self.ClickFunction)
                    return;
                //
                if (self.ClickFunction(item))
                    self.SelectedItem(item);                
            };
            //
            self.FirstOrDefault = function (id) {
                var matchingItem = null;
                ko.utils.arrayForEach(self.dataSource.items(), function (item) {
                    matchingItem = (!matchingItem && id === item[options.id]) ? item : matchingItem;
                });

                return matchingItem;
            }
            //
            self.SelectItem = function (item) {
                if (item) {
                    self.SelectedItem(item);
                }
            };
            self.DeselectItem = function () {
                self.SelectedItem(null);
            };
            //
            self.TakeCssItem = function (item) {
                if (!item || !item.IconClass)
                    return '';
                //
                var retval = item.IconClass;
                if (self.IsSelected(item))
                    retval += ' ' + 'active';
                //
                return retval;
            };
            //
            self.defaultConfig = {
                onClick: null,//функция для вызова при клике на элементе дерева для выбора, возвращает true если узел должен быть "выбран"
                Title: '', //заголовок
                TitleStyle: 'treeControlHeader-default', //стиль заголовка,
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
                self.ClickFunction = config.onClick;
                self.Title(config.Title);
                self.TitleStyle(config.TitleStyle);                
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
            self.AfterRender = function () {
                self.Load();
            };
            self.ContextMenuRequested = function (item, e) {
                if (!item) return true;

                self.ClickItem(item);

                if (self.SelectedItem() != item) return true;

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
        }
    }
    return module;
});