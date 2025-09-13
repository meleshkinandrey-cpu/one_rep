define(['jquery', 'knockout', 'jqueryUI'], function ($, ko, $ui) {
    {//получение нового идентификатора для контролов
        ko.getNewID_value = 0;
        ko.getNewID = function () {
            ko.getNewID_value++;
            return ko.getNewID_value.toString();
        };
    }
    //
    {//окончание изменение любого блока вызывает функцию
        ko.bindingHandlers.afterUpdateBlock = {
            update: function (el, va, ab) {
                va()();//get function and invoke
            }
        };
        ko.virtualElements.allowedBindings.afterUpdateBlock = true;
    }
    //
    {//привязка к модели dom-элемента
        ko.bindingHandlers.element = {
            init: function (element, valueAccessor) {
                var target = valueAccessor();
                target(element);
            }
        };
    }
    //
    {//фишки с операциями
        //текущий пользователь - админ
        ko.bindingHandlers.isAdmin = {
            init: function (element, valueAccessor, allBindings) {
                var $container = $(element);
                var ccsDisplayValue = $container.css('display');
                $container.css('display', 'none');
                //
                var val = ko.unwrap(valueAccessor());
                if (val && val != undefined) {
                    $.when(userD).done(function (user) {
                        if (user.HasAdminRole == val)
                            $container.css('display', ccsDisplayValue);
                    });
                }
            }
        };
        //
        //работает как в связке с cssOperation, visibleOperation, так и без них. Нет операции - прячем элемент.
        ko.bindingHandlers.operationID = {
            init: function (element, valueAccessor, allBindings) {
                var temp = allBindings.get('cssOperation');
                if (temp && temp != undefined)
                    return;//use css binding
                //
                temp = allBindings.get('visibleOperation');
                if (temp && temp != undefined)
                    return;//use css binding
                //
                var $container = $(element);
                var ccsDisplayValue = $container.css('display');
                $container.css('display', 'none');
                //
                var operationID = ko.unwrap(valueAccessor());
                if (operationID && operationID != undefined) {
                    $.when(operationIsGrantedD(operationID)).done(function (result) {
                        if (result == true)
                            $container.css('display', ccsDisplayValue);
                    });
                }
            }
        };
        //
        //работает как в связке с operationID, так и без. Нет операции - прячем нет класса (стиля).
        ko.bindingHandlers.cssOperation = {
            update: function (element, valueAccessor, allBindings) {
                var shouldHaveClassByOperation = true;
                var baseFunction = function () {
                    var value = ko.utils.unwrapObservable(valueAccessor());
                    if (typeof value == "object") {
                        ko.utils.objectForEach(value, function (className, shouldHaveClass) {
                            shouldHaveClass = shouldHaveClassByOperation && ko.utils.unwrapObservable(shouldHaveClass);
                            ko.utils.toggleDomNodeCssClass(element, className, shouldHaveClass);
                        });
                    } else {
                        value = String(value || ''); // Make sure we don't try to store or set a non-string value
                        ko.utils.toggleDomNodeCssClass(element, element[classesWrittenByBindingKey], false);
                        element[classesWrittenByBindingKey] = value;
                        ko.utils.toggleDomNodeCssClass(element, value, shouldHaveClassByOperation);
                    }
                };
                //
                var operationID = allBindings.get('operationID');
                if (operationID && operationID != undefined) {
                    $.when(operationIsGrantedD(operationID)).done(function (result) {
                        if (result == false)
                            shouldHaveClassByOperation = false;
                        baseFunction();
                    });
                }
                else
                    baseFunction();
            }
        };
        //
        //работает как в связке с operationID, так и без. Нет операции - прячем .
        ko.bindingHandlers.visibleOperation = {
            update: function (element, valueAccessor, allBindings) {
                var visible = true;
                var baseFunction = function () {
                    var value = visible && ko.utils.unwrapObservable(valueAccessor());
                    var isCurrentlyVisible = !(element.style.display == "none");
                    if (value && !isCurrentlyVisible)
                        element.style.display = "";
                    else if ((!value) && isCurrentlyVisible)
                        element.style.display = "none";
                };
                //
                var operationID = allBindings.get('operationID');
                if (operationID && operationID != undefined) {
                    $.when(operationIsGrantedD(operationID)).done(function (result) {
                        visible = result;
                        baseFunction();
                    });
                }
                else
                    baseFunction();
            }
        };
    }
    //
    {//чекбокс с тремя состояниями
        ko.bindingHandlers.checked3 = {
            init: function (element, valueAccessor, allBindings) {
                element.onclick = function () {
                    var value = valueAccessor();
                    var unwrappedValue = ko.unwrap(value);
                    //
                    var allowInterminate = allBindings.get('allowInterminate');
                    if (allowInterminate == undefined || allowInterminate == null)
                        allowInterminate = true;
                    //
                    if (unwrappedValue == true)
                        value(allowInterminate == true ? null : false);
                    else if (unwrappedValue == false)
                        value(true);
                    else
                        value(false);
                };
            },
            update: function (element, valueAccessor, allBindings) {
                var value = ko.unwrap(valueAccessor());
                //
                var allowInterminate = allBindings.get('allowInterminate');
                if (allowInterminate == undefined || allowInterminate == null)
                    allowInterminate = true;
                //
                if (value == true) {
                    element.indeterminate = false;
                    element.checked = true;
                } else if (value === false) {
                    element.indeterminate = false;
                    element.checked = false;
                } else if (allowInterminate == true) {
                    element.indeterminate = true;
                    element.checked = false;
                }
                else {
                    element.indeterminate = false;
                    element.checked = false;
                    valueAccessor(false);
                }
            }
        };
    }
    //
    {//подсветка в контенте какого-либо текста (например, найденного)
        var regexEscapePattern = /[.*+?|()\[\]{}\\$^]/g; // .*+?|()[]{}\$^
        var regexEscape = function (str) {
            return str.replace(regexEscapePattern, "\\$&");
        };
        var minCutSize = 200;//сколько символов минимум для начала обрезки
        var wordSideCount = 3;//сколько слов включать в обрезку
        var regexWordSplit = /([,.\s])+/g;
        //highlightText - для текста, который подсвечивают, searchText - что подсвечивать, highlightClass - каким стилем выделять, highlightTextCut - надо ли пытаться обрезать текст, где нет совпадений
        ko.bindingHandlers.highlightText = {
            update: function (element, valueAccessor, allBindings) {
                var searchText = allBindings.get('searchText') ? ko.unwrap(allBindings.get('searchText')) : null;
                var searchTextArray = allBindings.get('searchTextArray') ? ko.unwrap(allBindings.get('searchTextArray')) : null;
                //
                var highlightClass = allBindings.get('highlightClass') ? ko.unwrap(allBindings.get('highlightClass')) : 'highlightText';
                var highlightTextCut = allBindings.get('highlightTextCut') ? ko.unwrap(allBindings.get('highlightTextCut')) : false;
                //
                var sourceText = ko.unwrap(valueAccessor());
                var $element = $(element);
                //
                if (searchText && sourceText) {
                    searchText = regexEscape(searchText);
                    var regex = new RegExp('(' + searchText + ')', 'gi');
                    var splits = sourceText.split(regex);
                    highlightTextCut = sourceText.length > minCutSize ? highlightTextCut : false;
                    //
                    $element.empty();
                    for (var i = 0; i < splits.length; i++) {
                        var s = splits[i];
                        var $span = $('<span/>');
                        //
                        if (s == '')
                            continue;
                        //
                        if (s.toUpperCase() == searchText.toUpperCase()) //нужно выделить и запихнуть
                            $span.addClass(highlightClass).text(s);
                        else if (highlightTextCut == false) //нужно запихнуть с игнором тегов
                            $span.text(s);
                        else {//нужно обрезать и запихнуть
                            var splitWords = s.split(regexWordSplit);//слова, разделенные пробелами или .,
                            splitWords = splitWords.filter(function (el) {
                                return el != '';
                            });
                            var insertStr = '';
                            if (i == 0) {
                                insertStr += "...";
                                ko.utils.arrayForEach(splitWords.slice(-2 * wordSideCount), function (el) {//последние два слова
                                    insertStr += el;
                                });
                            }
                            else if (i == splits.length - 1) {
                                ko.utils.arrayForEach(splitWords.slice(0, 2 * wordSideCount), function (el) {//первые два слова
                                    insertStr += el;
                                });
                                insertStr += "...";
                            }
                            else if (s.length * 2 > minCutSize && splitWords.length > 2 * 2 * wordSideCount)//мы в середине и тут многобукав и в целом много слов
                            {
                                ko.utils.arrayForEach(splitWords.slice(0, 2 * wordSideCount), function (el) {//первые два слова
                                    insertStr += el;
                                });
                                insertStr += "...";
                                ko.utils.arrayForEach(splitWords.slice(-2 * wordSideCount), function (el) {//последние два слова
                                    insertStr += el;
                                });
                            }
                            else insertStr = s;
                            //
                            $span.text(insertStr);
                        }
                        //
                        $element.append($span);
                    }
                }
                else if (searchTextArray && searchTextArray.length > 0 && sourceText) {
                    var splitString = '';
                    ko.utils.arrayForEach(searchTextArray, function (el) {
                        if (el) {
                            var s = regexEscape(el);
                            if (splitString == '')
                                splitString = '(' + s + ')';
                            else splitString += '|(' + s + ')';
                        }
                    });
                    //
                    var regex = new RegExp(splitString, 'gi');
                    var splits = sourceText.split(regex);
                    highlightTextCut = sourceText.length > minCutSize ? highlightTextCut : false;
                    //
                    $element.empty();
                    for (var i = 0; i < splits.length; i++) {
                        var s = splits[i];
                        var $span = $('<span/>');
                        //
                        if (!s)
                            continue;
                        //
                        var needHighlight = ko.utils.arrayFirst(searchTextArray, function (el) {
                            if (el)
                                return s.toUpperCase() == el.toUpperCase();
                            else return false;
                        });
                        if (needHighlight != null) //нужно выделить и запихнуть
                            $span.addClass(highlightClass).text(s);
                        else if (highlightTextCut == false) //нужно запихнуть с игнором тегов
                            $span.text(s);
                        else {//нужно обрезать и запихнуть
                            var splitWords = s.split(regexWordSplit);//слова, разделенные пробелами или .,
                            splitWords = splitWords.filter(function (el) {
                                return el != '';
                            });
                            var insertStr = '';
                            if (i == 0) {
                                insertStr += "...";
                                ko.utils.arrayForEach(splitWords.slice(-2 * wordSideCount), function (el) {//последние два слова
                                    insertStr += el;
                                });
                            }
                            else if (i == splits.length - 1) {
                                ko.utils.arrayForEach(splitWords.slice(0, 2 * wordSideCount), function (el) {//первые два слова
                                    insertStr += el;
                                });
                                insertStr += "...";
                            }
                            else if (s.length * 2 > minCutSize && splitWords.length > 2 * 2 * wordSideCount)//мы в середине и тут многобукав и в целом много слов
                            {
                                ko.utils.arrayForEach(splitWords.slice(0, 2 * wordSideCount), function (el) {//первые два слова
                                    insertStr += el;
                                });
                                insertStr += "...";
                                ko.utils.arrayForEach(splitWords.slice(-2 * wordSideCount), function (el) {//последние два слова
                                    insertStr += el;
                                });
                            }
                            else insertStr = s;
                            //
                            $span.text(insertStr);
                        }
                        //
                        $element.append($span);
                    }
                }
                else $element.text(sourceText);
            }
        };
    }
    //
    {//drag & drop
        //move columns in ko.ListView control
        var _dragged;
        ko.bindingHandlers.dragDropColumnListView = {
            init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
                var options = ko.utils.unwrapObservable(valueAccessor());
                var $element = $(element);
                //
                var dragOptions = {
                    axis: 'x',
                    cursor: 'default',
                    cancel: '.columnResizeThumb',
                    distance: 10,
                    cursorAt: { left: 5 },
                    helper: 'clone',
                    refreshPositions: true,
                    snap: true,
                    drag: function (event, ui) {
                        ui.helper.addClass('drag');
                    },
                    start: function (event, ui) {
                        _dragged = options.target;
                        $element.closest('tr').addClass('dragContainer');
                    },
                    stop: function (event, ui) {
                        $element.closest('tr').removeClass('dragContainer');
                    },
                };
                $element.draggable(dragOptions).disableSelection();
                //
                var dropOptions = {
                    hoverClass: 'dragHover',
                    drop: function (event, ui) {
                        var dropAction = options.dropAction;
                        dropAction(_dragged, viewModel);
                    }
                };
                $element.droppable(dropOptions);
            }
        };
    }
    //
    ko.cloneVariable = function (val) {
        if (ko.isObservable(val))
            return ko.observable(val());
        else
            return val;
    };
});