define(['jquery'], function ($) {
    self.isDate = function (date) {
        if (date === undefined || date === null || date == '') return false;
        return !!(function (d) { return (d !== 'Invalid Date' && !isNaN(d)) })(new Date(date));
    };
    self.parseDate = function (fromServer, onlyDate) {
        if (!fromServer)
            return '';
        if (typeof fromServer === 'string' || fromServer instanceof String)
            fromServer = parseFloat(fromServer);
        var d = new Date(fromServer);

        var options = onlyDate ?
            {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            } :
            {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            };
        //
        return d.toLocaleString(locale, options).replace(',','');
    };
    self.getUtcDate = function (dt) {
        if (!dt)
            return null;
        if (typeof dt === 'object')
            return dt;
        //
        dt = dt.toString();
        if (dt.indexOf('Z') == dt.length - 1)
            return dt;
        else
            return dt + 'Z';
    };
    self.getLocaleHourMinString = function (intMinutesValue) { //have analog in InfraManager.Web.BLL.Helpers.ManhoursHelper
        var obj = getLocaleHourMinObject(intMinutesValue);
        //
        var showM = (obj.m >= 0 && obj.m <= 9) ? '0' + obj.m : obj.m;
        return ('' + obj.h + ' ' + getTextResource('ShortHours') + ' ' + showM + ' ' + getTextResource('ShortMinutes'));
    };
    self.getLocaleHourMinObject = function (intMinutesValue) {
        var hours = 0;
        var minutes = 0;
        //
        if (intMinutesValue != null || intMinutesValue != undefined) {
            hours = Math.floor(intMinutesValue / 60);
            minutes = intMinutesValue - hours * 60;
        }
        //
        return { h: hours, m: minutes };
    };   
    self.getDecimalSeparator = function () {
        //browser language
        //var decSep = '.';
        //try {
        //    var sep = parseFloat(3/2).toLocaleString().substring(1,2);
        //    if (sep === '.' || sep === ',')
        //        decSep = sep;
        //} catch(e){}
        //return decSep;
        //
        //user language
        if (locale == 'ru-RU')
            return ',';
        else
            return '.';
    };
    self.getMoneyString = function (x, delimiter, sep, grp) {
        if (x === null)
            return '';
        //
        if (x.toString().indexOf('.') !== -1)
            delimiter = '.';
        else if (x.toString().indexOf(',') !== -1)
            delimiter = ',';
        //
        delimiter || (delimiter = '.');// default delimiter
        var sx = ('' + x).split(delimiter), s = '', i, j;
        sep || (sep = ' ');// default seperator
        grp || grp === 0 || (grp = 3); // default grouping
        i = sx[0].length;
        while (i > grp) {
            j = i - grp;
            s = sep + sx[0].slice(j, i) + s;
            i = j;
        }
        s = sx[0].slice(0, i) + s;
        sx[0] = s;
        //
        if (sx.length == 2 && sx[1].length == 1)
            sx[1] += '0';
        else if (sx.length == 1)
            return sx[0].concat(getDecimalSeparator() + '00');
        //
        return sx.join(getDecimalSeparator());
    };
    self.normalize = function (decimal) { //возвращает число с двумя десятичными разрядами
        if (decimal !== null)
            return Math.floor(Math.floor(decimal * 1000) / 10) / 100;
        //
        return decimal;
    };
    self.getFormattedMoneyString = function (str) {
        if (!str)
            return '';
        //
        var trimmed = str.split(' ').join('').split(' ').join('').replace(',', '.');//hack
        //
        if (!$.isNumeric(trimmed))
            return str;
        //
        var dec = parseFloat(trimmed);
        var retval = getMoneyString(normalize(dec));
        return retval;
    };
});