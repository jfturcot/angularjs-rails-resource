# AngularJS Rails Resource

A resource factory inspired by $resource from AngularJS and [Misko's recommendation](http://stackoverflow.com/questions/11850025/recommended-way-of-getting-data-from-the-server).

When starting out with AngularJS and Rails we initially were using $resource but there were three things we didn't like that this gem sets out to provide:

 1.  $resource didn't return promises
 2.  Rails prefers JSON be root wrapped
 3.  Our JSON contained snake case (underscored) keys coming from our database but we didn't want to mix snake case and camel case in our UI

In case you are unfamiliar, the intent of the resource is to behave a bit like a remote model object.  One of the nice things about AngularJS
 is that it does not require you to create specific models for all of your data which gives you a lot of freedom for treating model data as basic
 javascript objects.  However, on the Rails side when exposing models to a javascript application you are likely going to follow the same pattern for multiple
 models where you will have a controller that has your basic index (query), get, create, update, delete functionality.

The resource object created by this factory simplifies access to those models by exposing a mix of "class" methods (query, get) and
 "instance" methods (create, update, delete/remove).

This module is being used for applications we are writing and we expect that over time that we will be adding additional functionality but we welcome contributions and suggestions.

## Installation

Add this line to your application's Gemfile:

    gem 'angularjs-rails-resource'

Include the javascript somewhere in your asset pipeline:

    //= require angularjs/rails/resource


## Dependencies
Since this is an [AngularJS](http://angularjs.org) module it of course depends on that but more specifically the it depends on the following AngularJS services:

* [$http](http://docs.angularjs.org/api/ng.$http)
* [$q](http://docs.angularjs.org/api/ng.$q)
* [$injector](http://docs.angularjs.org/api/AUTO.$injector)
* [$interpolate](http://docs.angularjs.org/api/ng.$interpolate)

## Resource Creation
Creating a resource using this factory is similar to using $resource, you just call the factory with the config options and it returns a new resource function.
The resource function serves two purposes.  First is that you can use (or define new) "class" methods directly accessible such as query and get to retrieve
instances from the backend rails service.  The second is that it allows you to use it as a constructor to create new instances of that resource giving you access
to create, update, and delete instance methods (or any others you add).

The typical use case is to define the resource as an AngularJS factory within a module and then inject that into a controller or directive.
See [Examples](#examples) below for more information on creating and injecting the resource.


### Config Options
The following options are available for the config object passed to the factory function.

 * **url** - This is the url of the service.  See [Resource URLs](#resource-urls) below for more information.
 * **name** - This is the name used for root wrapping when dealing with singular instances.
 * **pluralName** *(optional)* - If specified this name will be used for unwrapping query results,
        if not specified the singular name with an appended 's' will be used.
 * **nestedResources** *(optional)* - If your model accepts nested attributes, create an array of all the names that should have "_attributes" appended to it before
        being sent back to the server.
 * **httpConfig** *(optional)* - Passed directly to $http.
 * **defaultParams** *(optional)* - If the resource expects a default set of query params on every call you can specify them here.
 * **requestTransformers** *(optional) - See [Transformers / Interceptors](#transformers--interceptors)
 * **responseInterceptors** *(optional)* - See [Transformers / Interceptors](#transformers--interceptors)

**NOTE:** The names should be specified using camel case when using the key transformations because that happens before the root wrapping by default.
For example, you should specify "publishingCompany" and "publishingCompanies" instead of "publishing_company" and "publishing_companies".

## Resource URLs
The URL can be specified as one of three ways:

 1. function (context) - You can pass your own custom function that converts a context variable into a url string

 2. basic string - A string without any expression variables will be treated as a base URL and assumed that instance requests should append id to the end.

 3. AngularJS expression - An expression url is evaluated at run time based on the given context for non-instance methods or the instance itself. For example, given the url expression: /stores/{{storeId}}/items/{{id}}

        Item.query({category: 'Software'}, {storeId: 123}) would generate a GET to /stores/1234/items?category=Software
        Item.get({storeId: 123, id: 1}) would generate a GET to /stores/123/items/1

        new Item({store: 123}).create() would generate a POST to /stores/123/items
        new Item({id: 1, storeId: 123}).update() would generate a PUT to /stores/123/items/1


## Transformers / Interceptors
The transformers and interceptors can be specified using an array containing transformer/interceptor functions or strings
that can be resolved using Angular's DI.

The root wrapping and snake case to camel case conversions are implemented as transformers and interceptors.  So if you override
the default transformers and interceptors you will have to include those in the array as well (assuming you want that functionality).

That also means that if you don't want root wrapping and key conversions then you can just pass an emptry array for each
and no processing will be done on the data.

### Transformers
Transformer functions are called to transform the data before we send it to $http for POST/PUT.

The transformer functions will be called with the following signature

    function (data, resource)

The return value of the function must be the transformed data.

### Interceptors
Interceptor functions utilize [$q promises](http://docs.angularjs.org/api/ng.$q) to process the data returned from the server.

The interceptor is called with the promise returned from $http and is expected to return a promise for chaining.

The promise passed to each interceptor contains a reference to the resource to expose the configured options of the resource.

Each interceptor promise is expected to return the response or a $q.reject.  See [Promises](#promises) below for more information about the promise data.

## Promises
[$http documentation](http://docs.angularjs.org/api/ng.$http) describes the promise data very well so I highly recommend reading that.

In addition to the fields listed in the $http documentation an additional field named originalData is added to the response
object to keep track of what the field was originally pointing to.  The originalData is not a deep copy, it just ensures
that if response.data is reassigned that there's still a pointer to the original response.data object.


## Methods
Resources created using this factory have the following methods available and each one (except the constructor) returns a [Promise](#promises).

### constructor
***

The constructor is the function returned by the railsResourceFactory and can be used with the "new" keyword.

####Parameters
 * **data** *(optional)* - An object containing the data to be stored in the instance.

### query
***

A "class" method that executes a GET request against the base url with query parameters set via the params option.

####Parameters
 * **query params** - An map of strings or objects that are passed to $http to be turned into query parameters
 * **context** - A context object that is used during url evaluation to resolve expression variables


### get
***

A "class" method that executes a GET request against the resource url.

####Parameters
 * **context** - A context object that is used during url evaluation to resolve expression variables.  If you are using a basic url this can be an id number to append to the url.


### create
***

An "instance" method that executes a POST to the base url with the data defined in the instance.

####Parameters

None


### update
***

An "instance" method that executes a PUT to the resource url with the data defined in the instance.

####Parameters

None


### remove / delete
***

Both of these are "instance" methods that execute a DELETE to the resource url.

####Parameters

None


## Example
For a complete working example (including the rails side), check out the [Employee Training Tracker](https://github.com/FineLinePrototyping/employee-training-tracker) application
we open sourced based on an interface we created for use internally that uses this module as well as many others.

### Define Resource
In order to create a Book resource, we would first define the factory within a module.

    angular.module('book.services', ['rails']);
    angular.module('book.services').factory('Book', ['railsResourceFactory', function (railsResourceFactory) {
        return railsResourceFactory({url: '/books', name: 'book'});
    }]);

We would then inject that service into a controller:

    angular.module('book.controllers').controller('BookShelfCtrl', ['$scope', 'Book', function ($scope, Book) {
        // See following examples for using Book within your controller
    }]);

The examples below illustrate how you would then use the Book service to get, create, update, and delete data.

#### Extending
You can add additional "class" or "instance" methods by modifying the resource returned from the factory call.  For instance,
if you wanted to add a "class" method named "findByTitle" to the Book resource you would modify the service setup as follows:

    angular.module('book.services', ['rails']);
    angular.module('book.services').factory('Book', ['railsResourceFactory', function (railsResourceFactory) {
        var resource = railsResourceFactory({url: '/books', name: 'book'});
        resource.findByTitle = function (title) {
            return resource.query({title: title});
        };
        return resource;
    }]);

If you wanted to add an "instance" method to retrieve a related object:

    angular.module('book.services', ['rails']);
    angular.module('book.services').factory('Author', ['railsResourceFactory', function (railsResourceFactory) {
        return railsResourceFactory({url: '/authors', name: 'author'});
    }]);
    angular.module('book.services').factory('Book', ['railsResourceFactory', 'Author', function (railsResourceFactory, Author) {
        var resource = railsResourceFactory({url: '/books', name: 'book'});
        resource.prototype.getAuthor = function () {
            return Author.get(this.authorId);
        };
    }]);

Or say you instead had a nested "references" service call that returned a list of referenced books for a given book instance.  In that case you can add your own addition method that calls $http.get and then
passes the resulting promise to the processResponse method which will perform the same transformations and handling that the get or query would use.

    angular.module('book.services', ['rails']);
    angular.module('book.services').factory('Book', ['railsResourceFactory', '$http', function (railsResourceFactory, $http) {
        var resource = railsResourceFactory({url: '/books', name: 'book'});
        resource.prototype.getReferences = function () {
            var self = this;
            return resource.processResponse($http.get(resource.resourceUrl(this.id) + '/references')).then(function (references) {
                self.references = references;
                return self.references;
            });
        };
    }]);

### Query Books
To query for a list of books with the title "The Hobbit" you would use the query method:

    var books = Book.query({title: 'The Hobbit'});

We now have a promise in the books variable which we could then use within a template if we just wanted to do an ng-repeat over the books.  A lot of times though you'll probably want to show some indicator
to your user that the search is executing so you'd want to use a then handler:

    $scope.searching = true;
    var books = Book.query({title: 'The Hobbit'});
    books.then(function(results) {
        $scope.searching = false;
    }, function (error) {
        $scope.searching = false;
        // display error
    });


### Get Book
    var book = Book.get(1234);

Again, it's important to remember that book is a promise, if instead you wanted the book data you would use the "then" function:

    Book.get(1234).then(function (book) {
       // book contains the data returned from the service
    });

### Create Book
    var book = new Book({author: 'J. R. R. Tolkein', title: 'The Hobbit'});
    book.create().then(function (result) {
        // creation was successful
    });

### Update Book
    Book.get(1234).then(function (book) {
        book.author = 'J. R. R. Tolkein';
        book.update();
    });

Or, if you say the user typed in the book id into a scope variable and you wanted to update the book without having to first retrieve it:

    var book = new Book({id: $scope.bookId, author: $scope.authorName, title: $scope.bookTitle});
    book.update();

## Tests
The tests are written using [Jasmine](http://pivotal.github.com/jasmine/) and are run using [Testacular](http://vojtajina.github.com/testacular/).

Running the tests should be as simple as following the [instructions](https://github.com/vojtajina/testacular/blob/master/README.md)

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Added some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request

## License
Copyright (c) 2012 - 2013 [FineLine Prototyping, Inc.](http://www.finelineprototyping.com)

MIT License

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
