var COOKIEJAR_API_URL = 'https://evmecookie.appspot.com/api';

var user;

function $(id) {
    return document.getElementById(id);
}

function createElement(name, attributes, textValue)
{
    var element = document.createElement(name);
    for (var attribute in attributes)
    {
        element.setAttribute(attribute, attributes[attribute]);
    }
    if (textValue)
    {
        element.appendChild(document.createTextNode(textValue));
    }
    return element;
}

function ajax(method, url, data, success, failure) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
        if (xhr.readyState == 4)
        {
            console.log(xhr);
            if (xhr.status == 200 && success)
            {
                success.call(xhr);
            }
            else if (xhr.status != 200 && failure)
            {
                failure.call(xhr);
            }
        }
    };
    xhr.open(method, url, true);
    if (data)
    {
        formData = new FormData();
        for (i in data)
        {
            formData.append(i, data[i]);
        }
        xhr.send(formData);
    }
    else
    {
        xhr.send(null);
    }
}

// called with with the anchor element as this
function deleteCookie()
{
    $('status').innerHTML = 'Deleting cookie...';
    var cookieId = this.getAttribute('data-cookie-id');
    ajax(
        'DELETE',
        COOKIEJAR_API_URL + '/cookie/' + cookieId,
        null,
        refreshCookies,
        function() {
            $('status').innerHTML = 'Unable to delete cookie';
        }
    );
}

// called with with the anchor element as this
function updateCookie()
{
    // TODO: Add the ability to alter the description
    //       The backend supports it...
    $('status').innerHTML = 'Updating cookie...';
    var cookieId = this.getAttribute('data-cookie-id');

    // 10bis save their cookies both on 10bis.co.il and www.10bis.co.il
    // this way I'm querying for both.
    chrome.cookies.getAll({domain: '10bis.co.il'}, function(cookies){
        ajax(
            'POST',
            COOKIEJAR_API_URL + '/cookie/' + cookieId,
            {
                content: JSON.stringify(cookies)
            },
            function(){
                $('status').innerHTML = 'Cookie updated';
            },
            function(){
                $('status').innerHTML = 'Unable to update cookie';
            }
        );
    });
}

// called with with the anchor element as this
function useCookie()
{
    $('status').innerHTML = 'Loading cookie ...';
    var cookieId = this.getAttribute('data-cookie-id');
    ajax(
        'GET',
        COOKIEJAR_API_URL + '/cookie/' + cookieId,
        null,
        function(){
            cookie = JSON.parse(this.responseText);
            content = JSON.parse(cookie.content);
            for (item in content)
            {
                item = content[item];

                // the object returned by chrome.cookies.get is a bit different
                // make adjustments...
                item.url = 'http://www.10bis.co.il';
                delete item.session;
                delete item.hostOnly;

                // TODO: Put a callback and handle errors
                console.log(item);
                chrome.cookies.set(item);
            }
            $('status').innerHTML = 'Cookie ' + cookie.description + ' loaded';
        },
        function(){
            $('status').innerHTML = 'An error occured while trying to fetch cookie :(';
        }
    );
}

function refreshCookies()
{
    $('status').innerHTML = 'Updating...';
    var ul = $('cookies');
    // remove old list items
    ul.innerHTML = '';

    ajax(
        'GET',
        COOKIEJAR_API_URL + '/cookie',
        null,
        function(){
            cookies = JSON.parse(this.responseText);

            // populate list
            for (cookie in cookies)
            {
                cookie = cookies[cookie];
                li = document.createElement('li');
                li.appendChild(createElement('span', {class: 'author'}, cookie.author));
                li.appendChild(document.createTextNode(' - '));
                li.appendChild(createElement('span', {class: 'description'}, cookie.description));
                li.appendChild(document.createTextNode(' - '));
                use = createElement('a', {href: '#', 'data-cookie-id': cookie.id}, 'use');
                use.addEventListener('click', useCookie);
                li.appendChild(use);

                // if we are the cookie owner
                if (cookie.author == user)
                {
                    // delete, update links

                    li.appendChild(document.createTextNode(' - '));
                    del = createElement('a', {href: '#', 'data-cookie-id': cookie.id}, 'delete');
                    del.addEventListener('click', deleteCookie);
                    li.appendChild(del);

                    li.appendChild(document.createTextNode(' - '));
                    update = createElement('a', {href: '#', 'data-cookie-id': cookie.id}, 'update');
                    update.addEventListener('click', updateCookie);
                    li.appendChild(update);
                }
                ul.appendChild(li);
            }

            if (cookies.length == 0)
            {
                $('status').innerHTML = 'No cookies :(';
            }
            else
            {
                $('status').innerHTML = '';
            }
        },
        function(){
            $('status').innerHTML = 'Unable to refresh list';
        }
    );
}

function createCookie()
{
    $('status').innerHTML = 'Creating cookie';
    $('create').disabled = true;
    var description = $('description').value;

    // 10bis save their cookies both on 10bis.co.il and www.10bis.co.il
    // this way I'm querying for both.
    chrome.cookies.getAll({domain: '10bis.co.il'}, function(cookies){
        ajax(
            'POST',
            COOKIEJAR_API_URL + '/cookie',
            {
                description: description,
                content: JSON.stringify(cookies)
            },
            function(){
                $('description').value = '';
                $('create').disabled = false;
                refreshCookies();
            },
            function(){
                $('status').innerHTML = 'Failed creating cookie :(';
            }
        );
    });
}

document.addEventListener('DOMContentLoaded', function(){
    ajax(
        'GET',
        COOKIEJAR_API_URL + '/whoami',
        null,
        function(){
            user = this.responseText;
            if (user == '')
            {
                $('status').innerHTML = 'Not logged in';
                window.open(COOKIEJAR_API_URL + '/whoami');
            }
            else
            {
                $('create').addEventListener('click', createCookie);
                $('refresh').addEventListener('click', refreshCookies);
                refreshCookies();
            }
        },
        function(){
            $('status').innerHTML = 'Unable to query who you are :(';
        }
    );
});
