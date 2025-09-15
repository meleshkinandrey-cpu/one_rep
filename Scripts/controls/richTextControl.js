define(['jquery', 'jqueryTimePicker'], function ($) {
    var module = {
        control: function () {
            var self = this;
            var shortPath = function () {
                if (self.$iframe.length > 0) {
                    return self.$iframe[0].contentWindow;
                }
                else return null;
            };
            var shortEditor = function () {
                var path = shortPath();
                if (path)
                    return path.ASPxClientControl.GetControlCollection().GetByName('MainHtmlEditor');
                return null;
            };
            //
            self.init = function ($container, settings) {
                var d = $.Deferred();
                //
                var config = settings;
                //
                require(['text!../Templates/RichTextControl/Iframe.html'], function (template) {
                    $container.html(template);
                    self.$iframe = $container.find('.richTextIframe');
                    if (self.$iframe.length > 0)
                    {
                        self.$iframe.attr('src', getRichEditUrl());
                        self.$iframe.load(function () {
                            if (shortEditor() != null) {
                                shortEditor().ExecuteCommand(shortPath().ASPxClientCommandConsts.FULLSCREEN_COMMAND, "", false);
                                /*shortPath().$('.dxr-minBtn').click();
                                shortEditor().barDockManager.barDock.toolbars[0].tabs[2].getTabControlTab().SetVisible(false);
                                shortEditor().barDockManager.barDock.toolbars[0].tabs[1].getTabControlTab().SetVisible(false);*/
                            }
                            d.resolve();
                        });
                    }
                    else d.resolve();
                    //                    
                });
                //
                return d.promise();
            };
            //
            self.ShowToolbar = function () {
                if (self.$iframe && shortEditor() != null) {
                    shortEditor().barDockManager.barDock.SetVisible(true);
                }
            };
            //
            self.HideToolbar = function () {
                if (self.$iframe && shortEditor() != null) {
                    shortEditor().barDockManager.barDock.SetVisible(false);
                }
            };
            //
            self.getValue = function () {
                if (self.$iframe && shortEditor() != null) {
                    var value = shortEditor().GetHtml();
                    return value;
                }
                return '';
            };
            //
            self.setValue = function (html) {
                if (self.$iframe && shortEditor() != null) {
                    var value = shortEditor().SetHtml(html);
                    return value;
                }
            };
            //
            self.destroy = function () {
                if (self.$iframe)
                    self.$iframe.remove();
            };
        }
    }
    return module;
});