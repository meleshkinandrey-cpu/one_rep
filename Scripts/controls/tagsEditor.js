define(['knockout', 'jquery', 'usualForms'], function (ko, $, fhModule) {
    var module = {
        control: function (obj) {
            var self = this;
            self.tagsControlDivID = "tagsControl";
            self.mainRegionID = null;
            self.addTagText = '';
            //
            self.GetTags = function () {
                return $('.fake-input').val();
            };
            //
            self.TagExist = function (tag) {
                var taglist = $('.fake-input').val().split(',');
                return (jQuery.inArray(tag, taglist) >= 0); //true when tag exists, false when not
            };
            self.UpdateFakeInput = function (taglist) {
                $('.fake-input').val(taglist.join(','));
            };
            self.ImportTags = function (taglist) {
                $('.fake-input').val('');
                var tags = taglist.split(',');
                for (i = 0; i < tags.length; i++) {
                    self.AddTag(tags[i]);
                }
            };
            self.AddTag = function (tag) {
                tag = jQuery.trim(tag);
                var skipTag = self.TagExist(tag);
                //
                if (tag != '' && !skipTag) {
                    $('<span>').addClass('tag').append(
                        $('<span>').text(tag).append('&nbsp;&nbsp;'),
                        $('<a>', {
                            href: '#',
                            text: 'x'
                        }).click(function () {
                            return self.RemoveTag(escape(tag));
                        })
                    ).insertBefore('.tag-text-input');
                    //
                    var tagslist = $('.fake-input').val().split(',');
                    if (tagslist[0] == '')
                        tagslist = new Array();
                    //
                    tagslist.push(tag);
                    self.UpdateFakeInput(tagslist);
                    //
                    $('.tag-text-input').val('');
                    $('.tag-text-input').focus();
                }
            };
            self.RemoveTag = function (tag) {
                $('.tags-container .tag').remove();
                //
                var oldTagList = $('.fake-input').val().split(',');
                var newTags = '';
                tag = unescape(tag);
                for (i = 0; i < oldTagList.length; i++) {
                    if (oldTagList[i] != tag)
                        newTags = newTags + ',' + oldTagList[i];
                }
                self.ImportTags(newTags);
            };

            self.InitTagEditor = function (options) {
                //Delete last tag on backspace
                $('.tag-text-input').bind('keydown', function (event) {
                    if (event.keyCode == 8 && $('.tag-text-input').val() == '') {
                        event.preventDefault();
                        var last_tag = $('.tags-container').find('.tag:last').text();
                        last_tag = last_tag.replace(/[\s]+x$/, '');
                        self.RemoveTag(escape(last_tag));
                    }
                });
            };

            self.SearcherText = ko.observable(null);
            var loadD = $.Deferred();
            var $fullLoadD = $.Deferred();
            self.Load = function (MainRegionID, preservedTags) {
                self.mainRegionID = MainRegionID;
                var parent = $('#' + self.mainRegionID);
                var div = '<div id="' + self.tagsControlDivID + '"class = "tags_Control" data-bind="template: {name: \'Search/TagsEditor\', afterRender: AfterRender}"/>';
                self.addTagText = getTextResource('SearchEnterTags');
                parent.append(div);
                //
                var elem = document.getElementById(self.tagsControlDivID);
                try {
                    ko.applyBindings(self, elem);
                }
                catch (err) {
                    if (elem)
                        throw err;
                }
                //
                $.when(loadD).done(self.InitSearcher);
                //
                return $fullLoadD.promise();
            };
            self.AfterRender = function () {
                self.InitTagEditor();
                loadD.resolve();
            };

            self.Remove = function () {
                var region = $('#' + self.tagsControlDivID).remove();
            }

            self.InitSearcher = function () {
                var fh = new fhModule.formHelper();
                var ctrlD = fh.SetTextSearcherToField(
                  $('.tags-container').find('.tag-text-input'),
                    'TagSearcher',
                    null,//default template
                    null,//searcher params
                    function (objectInfo) {//select
                        self.SearcherText(objectInfo.FullName);
                        self.AddTag(objectInfo.FullName);
                        null,
                        null
                    },
                    function () {//reset
                        self.SearcherText(null);
                    },
                    null,
                    null,
                    true);
                $.when(ctrlD).done(function (ctrl) {
                    ctrl.LoadD.done(function () {
                        $('.tags-container').css('position', 'absolute');
                        //$('.tag-text-input').focus();
                        ctrl.Close();
                        setTimeout(ctrl.Close, 500);
                        //
                        ctrl.itemEval = function (item) {
                            var result = true;
                            //
                            var tagslist = $('.fake-input').val().split(',');
                            for (i = 0; i < tagslist.length; i++) {
                                if (item.FullName == tagslist[i])
                                    result = false;
                            }
                            //
                            return result;
                        };
                        //
                        $('#' + ctrl.eraserDivID).css('display', 'none');
                        var oldShowMethod = ctrl.Show;
                        ctrl.Show = function () {
                            var newItems = ko.observableArray([]);
                            ctrl.PreservedItems().forEach(function (item) {
                                if (ctrl.itemEval(item))
                                    newItems.push(item);
                            });
                            ctrl.Items(newItems());
                            //
                            oldShowMethod();
                            var div = $('#' + ctrl.searcherDivID);
                            div.css('top', div.offset().top + 15 + 'px');
                        };
                        $fullLoadD.resolve();
                    });
                });
                //
                return ctrlD;
            };
            self.Clear = function () {
                $('.tags-container .tag').remove();
                $('.fake-input').val('');
            }
        }
    }
    return module;
});
