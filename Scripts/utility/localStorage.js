define(['jquery'], function ($) {
    function getElem(keyName) {
        if (typeof (Storage) !== 'undefined') {
            var item = JSON.parse(localStorage.getItem(keyName));
            if (item === null) 
                return null;
            else return item;
        } else {
            console.log('Браузер не поддерживает хранилище');
            return null;
        }
    }
    //
    function setElem(keyName, newValue) { //return success
        if (typeof (Storage) !== 'undefined') {
            var item = JSON.parse(localStorage.getItem(keyName));
            if (item === null) {
                localStorage.setItem(keyName, JSON.stringify(newValue));
            }
            else {
                if (typeof newValue === 'string' || typeof newValue === 'number')
                    item = newValue;
                else {
                    if (typeof item === 'string' || typeof item === 'number')
                        item = newValue;
                    else {
                        if ($.isArray(newValue)) {
                            if ($.isArray(item)) {
                                for (var i = 0; i < newValue.length; i++) {
                                    if (typeof newValue[i] === 'string' || typeof newValue[i] === 'number')
                                        item[i] = newValue[i];
                                    else {
                                        if (newValue[i].ID !== 'undefined') {
                                            var isFinded = false;
                                            $.each(item, function (index, elem) {
                                                if (elem.ID !== 'undefined' && elem.ID === newValue[i].ID) {
                                                    $.extend(item[index], newValue[i]);
                                                    isFinded = true;
                                                    return false;
                                                }
                                            });
                                            if (!isFinded)
                                                $.extend(item[i], newValue[i]);
                                        }
                                        else $.extend(item[i], newValue[i]);
                                    }
                                }
                            } else item = newValue;
                        } else item = newValue;//$.extend(item, newValue);
                    }
                }
                localStorage.setItem(keyName, JSON.stringify(item));
            }            
            return true;
        } else {
            console.log('Браузер не поддерживает хранилище');
            return false;
        }
    }
    //
    function clearElem(keyName) {
        if (typeof (Storage) !== 'undefined') {
            var item = JSON.parse(localStorage.getItem(keyName));
            if (item !== null)
                localStorage.removeItem(keyName);
            return true; 
        } else {
            console.log('Браузер не поддерживает хранилище');
            return null;
        }
    }
    //
    function clearStorage() {
        if (typeof (Storage) !== 'undefined') {
            var log = localStorage.getItem('_LOG_');
            localStorage.clear();
            localStorage.setItem('_LOG_', log);
        } else {
            console.log('Браузер не поддерживает хранилище');
            return null;
        }
    }
    //
    function log(newMess) {
        if (typeof (Storage) !== 'undefined') {
            var log = localStorage.getItem('_LOG_');
            if (log)
                log += newMess;
            else log = newMess;
            localStorage.setItem('_LOG_', log);
        } else {
            console.log('Браузер не поддерживает хранилище');
            return null;
        }
    }
    //
    return {
        getElem: getElem,
        setElem: setElem,
        clearElem: clearElem,
        clearStorage: clearStorage,
        log: log
    };
});