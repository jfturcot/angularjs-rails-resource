describe("js.rails", function () {
    'use strict';

    beforeEach(module('rails'));

    describe('railsRootWrapping', function() {
        var q, rootScope,
            transformer, interceptor,
            config = {rootName: 'test', rootPluralName: 'tests'};


        function testTransform(wrappedData, unwrappedData) {
            var result, resultPromise,
                deferred = q.defer();

            expect(transformer(unwrappedData, config)).toEqualData(wrappedData);
            deferred.promise.resource = config;
            expect(resultPromise = interceptor(deferred.promise)).toBeDefined();

            resultPromise.then(function (response) {
                result = response;
            });

            deferred.resolve({data: wrappedData});
            rootScope.$digest(); // needed for $q to actually run callbacks
            expect(result).toEqualData({data: unwrappedData});
        }

        beforeEach(inject(function ($rootScope, $q, railsRootWrappingTransformer, railsRootWrappingInterceptor) {
            q = $q;
            rootScope = $rootScope;
            transformer = railsRootWrappingTransformer;
            interceptor = railsRootWrappingInterceptor;
        }));

        it('should handle null root', function() {
            testTransform({test: null}, null);
        });

        it('should transform arrays', function() {
            testTransform({tests: [1, 2, 3]}, [1, 2, 3]);
        });

        it('should transform object', function() {
            testTransform({test: {abc: 'xyz', def: 'abc'}}, {abc: 'xyz', def: 'abc'});
        });
    });

    describe('railsFieldRenaming', function() {
        var q, rootScope,
            transformer, interceptor;

        function testTransform(underscoreData, camelizeData) {
            var result, resultPromise,
                deferred = q.defer();

            expect(transformer(angular.copy(camelizeData, {}))).toEqualData(underscoreData);
            expect(resultPromise = interceptor(deferred.promise)).toBeDefined();

            resultPromise.then(function (response) {
                result = response;
            });

            deferred.resolve(angular.copy(underscoreData, {}));
            rootScope.$digest(); // needed for $q to actually run callbacks
            expect(result).toEqualData(camelizeData);
        }

        beforeEach(inject(function ($rootScope, $q, railsFieldRenamingTransformer, railsFieldRenamingInterceptor) {
            q = $q;
            rootScope = $rootScope;
            transformer = railsFieldRenamingTransformer;
            interceptor = railsFieldRenamingInterceptor;
        }));

        it('should ignore empty response', function() {
            testTransform({}, {});
        });

        it('should ignore null response data', function() {
            testTransform({data: null}, {data: null});
        });

        it('should leave non-data response fields untouched', function() {
            testTransform({data: null, test_value: 'xyz'}, {data: null, test_value: 'xyz'});
        });

        it('should transform abc_def <-> abcDef', function() {
            testTransform({data: {abc_def: 'xyz'}}, {data: {abcDef: 'xyz'}});
        });

        it('should transform abc_def, ghi_jkl <-> abcDef, ghiJkl', function() {
            testTransform({data: {abc_def: 'xyz', ghi_jkl: 'abc'}}, {data: {abcDef: 'xyz', ghiJkl: 'abc'}});
        });

        it('should transform abc <-> abc', function() {
            testTransform({data: {abc: 'xyz'}}, {data: {abc: 'xyz'}});
        });

        it('should transform _abc <-> _abc', function() {
            testTransform({data: {_abc: 'xyz'}}, {data: {_abc: 'xyz'}});
        });

        it('should transform abc_ <-> abc_', function() {
            testTransform({data: {abc_: 'xyz'}}, {data: {abc_: 'xyz'}});
        });

        it('should transform nested abc_def.abc_def <-> abcDef.abcDef', function() {
            testTransform({data: {abc_def: {abc_def: 'xyz'}}}, {data: {abcDef: {abcDef: 'xyz'}}});
        });

        it('should transform nested abc_def.abc_def, abc_def.ghi_jkl <-> abcDef.abcDef, abcDef.ghiJkl', function() {
            testTransform({data: {abc_def: {abc_def: 'xyz', ghi_jkl: 'abc'}}}, {data: {abcDef: {abcDef: 'xyz', ghiJkl: 'abc'}}});
        });

        it('should transform nested abc.abc_def <-> abc.abcDef', function() {
            testTransform({data: {abc: {abc_def: 'xyz'}}}, {data: {abc: {abcDef: 'xyz'}}});
        });

        it('should handle empty root array', function() {
            testTransform({data: []}, {data: []});
        });

        it('should camelize array of objects', function() {
            testTransform({data: [{abc_def: 'xyz'}, {ghi_jkl: 'abc'}]}, {data: [{abcDef: 'xyz'}, {ghiJkl: 'abc'}]});
        });

        it('should handle array of strings', function() {
            testTransform({data: ['abc', 'def']}, {data: ['abc', 'def']});
        });

        it('should handle array of numbers', function() {
            testTransform({data: [1, 2, 3]}, {data: [1, 2, 3]});
        });
    });

    describe('railsNestedResources', function() {
        var transformer,
            config = {nestedResources: ['test', 'test2']};

        function testTransform(nestedData, renamedNestedData) {
            expect(transformer(nestedData, config)).toEqualData(renamedNestedData);
        }

        beforeEach(inject(function ($rootScope, $q, railsNestedResourcesTransformer) {
            transformer = railsNestedResourcesTransformer;
        }));

        it('should append _attributes to nested resources', function() {
            testTransform({test: {abc: "xyz"}}, {test_attributes: {abc: "xyz"}});
        });

        it('should append _attributes only to nested resources in the config', function() {
            testTransform({abc: {zyx: "xyz"}, test: {abc: "zxy"}}, {abc: {zyx: "xyz"}, test_attributes: {abc: "zxy"}});
        });

        it('should only append _attributes to an object', function() {
            testTransform({test: "abc"}, {test: "abc"});
        });

        it('should append _attributes to all the nested resources in the config', function() {
            testTransform({test: {abc: "xyz"}, test2: {abc: "zxy"}}, {test_attributes: {abc: "xyz"}, test2_attributes: {abc: "zxy"}});
        });

        it('should append _attributes to the deep nested resources', function() {
            testTransform({abc: {test: {abc: "xyz"}}}, {abc: {test_attributes: {abc: "xyz"}}});
        });

    });

    describe('singular railsResourceFactory', function() {
        var $httpBackend, $rootScope, factory, Test,
            config = {
                url: '/test',
                name: 'test'
            };

        beforeEach(inject(function (_$httpBackend_, _$rootScope_, railsResourceFactory) {
            $httpBackend = _$httpBackend_;
            $rootScope = _$rootScope_;
            factory = railsResourceFactory;
            Test = railsResourceFactory(config);
        }));

        afterEach(function() {
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
        });

        it('query should return resource object when response is single object', inject(function($httpBackend) {
            var promise, result;

            $httpBackend.expectGET('/test').respond(200, {test: {abc: 'xyz'}});

            expect(promise = Test.query()).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(result).toBeInstanceOf(Test);
            expect(result).toEqualData({abc: 'xyz'});
        }));

        it('query should return no data on 204', inject(function($httpBackend) {
            var promise, result;

            $httpBackend.expectGET('/test').respond(204);
            expect(promise = Test.query()).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(result).toBeUndefined();
        }));

        it('query should add parameter abc=1', inject(function($httpBackend) {
            var promise;

            $httpBackend.expectGET('/test?abc=1').respond(200, {test: {abc: 'xyz'}});

            expect(promise = Test.query({abc: '1'})).toBeDefined();
            $httpBackend.flush();
        }));

        it('query should add parameters abc=1 & xyz=2', inject(function($httpBackend) {
            var promise;

            $httpBackend.expectGET('/test?abc=1&xyz=2').respond(200, {test: {abc: 'xyz'}});

            expect(promise = Test.query({abc: '1', xyz: 2})).toBeDefined();
            $httpBackend.flush();
        }));

        it('query with default params should add parameter abc=1', inject(function($httpBackend) {
            var promise, resource, defaultParamsConfig = {};

            $httpBackend.expectGET('/test?abc=1').respond(200, {test: {abc: 'xyz'}});

            angular.copy(config, defaultParamsConfig);
            defaultParamsConfig.defaultParams = {abc: '1'};

            resource = factory(defaultParamsConfig);
            expect(promise = resource.query()).toBeDefined();

            $httpBackend.flush();
        }));

        it('get should return resource object when response is 200', inject(function($httpBackend) {
            var promise, result;

            $httpBackend.expectGET('/test/123').respond(200, {test: {id: 123, abc: 'xyz'}});

            expect(promise = Test.get(123)).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(result).toBeInstanceOf(Test);
            expect(result).toEqualData({id: 123, abc: 'xyz'});
        }));

        it('get should work with id as string as well', inject(function($httpBackend) {
            var promise, result;

            $httpBackend.expectGET('/test/123').respond(200, {test: {id: 123, abc: 'xyz'}});

            expect(promise = Test.get('123')).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(result).toBeInstanceOf(Test);
            expect(result).toEqualData({id: 123, abc: 'xyz'});
        }));

        it('get should call failure callback when 404', inject(function($httpBackend) {
            var promise, success = false, failure = false;

            $httpBackend.expectGET('/test/123').respond(404);

            expect(promise = Test.get(123)).toBeDefined();

            promise.then(function () {
                success = true;
            }, function () {
                failure = true;
            });

            $httpBackend.flush();

            expect(success).toBe(false);
            expect(failure).toBe(true);
        }));

        it('get with default params should add parameter abc=1', inject(function($httpBackend) {
            var promise, resource, defaultParamsConfig = {};

            $httpBackend.expectGET('/test/123?abc=1').respond(200, {test: {abc: 'xyz'}});

            angular.copy(config, defaultParamsConfig);
            defaultParamsConfig.defaultParams = {abc: '1'};

            resource = factory(defaultParamsConfig);
            expect(promise = resource.get(123)).toBeDefined();

            $httpBackend.flush();
        }));

        it('should be able to turn off root mapping and field renaming', inject(function($httpBackend) {
            var promise, result, resource;

            $httpBackend.expectGET('/test/123').respond(200, {id: 123, abc_def: 'xyz'});

            resource = factory(config);
            resource.responseInterceptors = [];
            resource.requestTransformers = [];
            expect(promise = resource.get(123)).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(result).toBeInstanceOf(resource);
            expect(result).toEqualData({id: 123, abc_def: 'xyz'});
        }));

        it('should be able to turn off root mapping but keep field renaming', inject(function($httpBackend) {
            var promise, result, resource, testConfig = {};

            $httpBackend.expectGET('/test/123').respond(200, {id: 123, abc_def: 'xyz'});

            angular.copy(config, testConfig);
            testConfig.requestTransformers = [];
            testConfig.responseInterceptors = ['railsFieldRenamingInterceptor'];
            resource = factory(testConfig);

            expect(promise = resource.get(123)).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(result).toBeInstanceOf(resource);
            expect(result).toEqualData({id: 123, abcDef: 'xyz'});
        }));

        it('should be able to create new instance and save it', inject(function($httpBackend) {
            var data = new Test({abcDef: 'xyz'});

            $httpBackend.expectPOST('/test', {test: {abc_def: 'xyz'}}).respond(200, {test: {id: 123, abc_def: 'xyz'}});
            data.create();
            $httpBackend.flush();

            expect(data).toEqualData({id: 123, abcDef: 'xyz'});
        }));

        it('should be able to create new instance and update it', inject(function($httpBackend) {
            var data = new Test({abcDef: 'xyz'});

            $httpBackend.expectPOST('/test', {test: {abc_def: 'xyz'}}).respond(200, {test: {id: 123, abc_def: 'xyz'}});
            data.create();
            $httpBackend.flush(1);

            expect(data).toEqualData({id: 123, abcDef: 'xyz'});

            $httpBackend.expectPUT('/test/123', {test: {id: 123, xyz: 'abc', abc_def: 'xyz'}}).respond(200, {test: {id: 123, abc_def: 'xyz', xyz: 'abc', extra: 'test'}});
            data.xyz = 'abc';
            data.update();
            $httpBackend.flush();

            expect(data).toEqualData({id: 123, abcDef: 'xyz', xyz: 'abc', extra: 'test'});
        }));

        it('create with default params should add parameter abc=1', inject(function($httpBackend) {
            var promise, Resource, data, defaultParamsConfig = {};

            $httpBackend.expectPOST('/test?abc=1', {test: {}}).respond(200, {test: {abc: 'xyz'}});

            angular.copy(config, defaultParamsConfig);
            defaultParamsConfig.defaultParams = {abc: '1'};

            Resource = factory(defaultParamsConfig);
            data = new Resource();
            data.create();

            $httpBackend.flush();
        }));

        it('should be able to get resource and update it', inject(function($httpBackend) {
            var promise, result;

            $httpBackend.expectGET('/test/123').respond(200, {test: {id: 123, abc: 'xyz', xyz: 'abcd'}});

            expect(promise = Test.get(123)).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(result).toBeInstanceOf(Test);
            expect(result).toEqualData({id: 123, abc: 'xyz', xyz: 'abcd'});

            $httpBackend.expectPUT('/test/123', {test: {id: 123, abc: 'xyz', xyz: 'abc'}}).respond(200, {test: {id: 123, abc: 'xyz', xyz: 'abc', extra: 'test'}});
            result.xyz = 'abc';
            result.update();
            $httpBackend.flush();

            // abc was originally set on the object so it should still be there after the update
            expect(result).toEqualData({id: 123, abc: 'xyz', xyz: 'abc', extra: 'test'});
        }));

        it('update should handle 204 response', inject(function($httpBackend) {
            var promise, result;

            $httpBackend.expectGET('/test/123').respond(200, {test: {id: 123, abc: 'xyz'}});

            expect(promise = Test.get(123)).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(result).toBeInstanceOf(Test);
            expect(result).toEqualData({id: 123, abc: 'xyz'});

            $httpBackend.expectPUT('/test/123', {test: {id: 123, abc: 'xyz', xyz: 'abc'}}).respond(204);
            result.xyz = 'abc';
            result.update();
            $httpBackend.flush();

            expect(result).toEqualData({id: 123, abc: 'xyz', xyz: 'abc'});
        }));

        it('should be able to delete instance returned from get', inject(function($httpBackend) {
            var promise, result;

            $httpBackend.expectGET('/test/123').respond(200, {test: {id: 123, abc: 'xyz'}});

            expect(promise = Test.get(123)).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(result).toBeInstanceOf(Test);
            expect(result).toEqualData({id: 123, abc: 'xyz'});

            $httpBackend.expectDELETE('/test/123').respond(204);
            result.remove();
            $httpBackend.flush();
        }));

        it('delete with default params should add parameter abc=1', inject(function($httpBackend) {
            var promise, Resource, data, defaultParamsConfig = {};

            $httpBackend.expectDELETE('/test/123?abc=1').respond(204);

            angular.copy(config, defaultParamsConfig);
            defaultParamsConfig.defaultParams = {abc: '1'};

            Resource = factory(defaultParamsConfig);
            data = new Resource();
            data.id = 123;
            data.remove();

            $httpBackend.flush();
        }));
    });

    describe('plural railsResourceFactory', function() {
        var $httpBackend, $rootScope, factory, PluralTest,
            pluralConfig = {
                url: '/pluralTest',
                name: 'singular',
                pluralName: 'plural'
            };

        beforeEach(inject(function (_$httpBackend_, _$rootScope_, railsResourceFactory) {
            $httpBackend = _$httpBackend_;
            $rootScope = _$rootScope_;
            factory = railsResourceFactory;
            PluralTest = railsResourceFactory(pluralConfig);
        }));

        afterEach(function() {
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
        });

        it('query should return array of resource objects when result is an array', inject(function($httpBackend) {
            var promise, result;

            $httpBackend.expectGET('/pluralTest').respond(200, {plural: [{abc: 'xyz'}, {xyz: 'abc'}]});

            expect(promise = PluralTest.query()).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(angular.isArray(result)).toBe(true);
            angular.forEach(result, function (value) {
                expect(value).toBeInstanceOf(PluralTest);
            });
            expect(result[0]).toEqualData({abc: 'xyz'});
            expect(result[1]).toEqualData({xyz: 'abc'});

        }));

        it('query should return empty array when result is empty array', inject(function($httpBackend) {
            var promise, result;

            $httpBackend.expectGET('/pluralTest').respond(200, {plural: []});

            expect(promise = PluralTest.query()).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(angular.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        }));
    });

    describe('nested railsResourceFactory', function() {
        var $httpBackend, $rootScope, factory, NestedTest,
            nestedConfig = {
                url: '/nested/{{nestedId}}/test/{{id}}',
                name: 'nestedTest'
            };

        beforeEach(inject(function (_$httpBackend_, _$rootScope_, railsResourceFactory) {
            $httpBackend = _$httpBackend_;
            $rootScope = _$rootScope_;
            factory = railsResourceFactory;
            NestedTest = railsResourceFactory(nestedConfig);
        }));

        afterEach(function() {
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
        });

        it('query should return resource object when response is single object', inject(function($httpBackend) {
            var promise, result;

            $httpBackend.expectGET('/nested/1234/test').respond(200, {nested_test: {abc: 'xyz'}});

            expect(promise = NestedTest.query(null, {nestedId: 1234})).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(result).toBeInstanceOf(NestedTest);
            expect(result).toEqualData({abc: 'xyz'});
        }));

        it('query should return no data on 204', inject(function($httpBackend) {
            var promise, result;

            $httpBackend.expectGET('/nested/1234/test').respond(204);
            expect(promise = NestedTest.query(null, {nestedId: 1234})).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(result).toBeUndefined();
        }));

        it('query should add parameter abc=1', inject(function($httpBackend) {
            var promise;

            $httpBackend.expectGET('/nested/1234/test?abc=1').respond(200, {nested_test: {abc: 'xyz'}});

            expect(promise = NestedTest.query({abc: '1'}, {nestedId: 1234})).toBeDefined();
            $httpBackend.flush();
        }));

        it('query should add parameters abc=1 & xyz=2', inject(function($httpBackend) {
            var promise;

            $httpBackend.expectGET('/nested/1234/test?abc=1&xyz=2').respond(200, {nested_test: {abc: 'xyz'}});

            expect(promise = NestedTest.query({abc: '1', xyz: 2}, {nestedId: 1234})).toBeDefined();
            $httpBackend.flush();
        }));

        it('query with default params should add parameter abc=1', inject(function($httpBackend) {
            var promise, resource, defaultParamsConfig = {};

            $httpBackend.expectGET('/nested/1234/test?abc=1').respond(200, {nested_test: {abc: 'xyz'}});

            angular.copy(nestedConfig, defaultParamsConfig);
            defaultParamsConfig.defaultParams = {abc: '1'};

            resource = factory(defaultParamsConfig);
            expect(promise = resource.query(null, {nestedId: 1234})).toBeDefined();

            $httpBackend.flush();
        }));

        it('get should return resource object when response is 200', inject(function($httpBackend) {
            var promise, result;

            $httpBackend.expectGET('/nested/1234/test/123').respond(200, {nested_test: {id: 123, abc: 'xyz'}});

            expect(promise = NestedTest.get({nestedId: 1234, id: 123})).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(result).toBeInstanceOf(NestedTest);
            expect(result).toEqualData({id: 123, abc: 'xyz'});
        }));

        it('get should call failure callback when 404', inject(function($httpBackend) {
            var promise, success = false, failure = false;

            $httpBackend.expectGET('/nested/1234/test/123').respond(404);

            expect(promise = NestedTest.get({nestedId: 1234, id: 123})).toBeDefined();

            promise.then(function () {
                success = true;
            }, function () {
                failure = true;
            });

            $httpBackend.flush();

            expect(success).toBe(false);
            expect(failure).toBe(true);
        }));

        it('get with default params should add parameter abc=1', inject(function($httpBackend) {
            var promise, resource, defaultParamsConfig = {};

            $httpBackend.expectGET('/nested/1234/test/123?abc=1').respond(200, {nested_test: {abc: 'xyz'}});

            angular.copy(nestedConfig, defaultParamsConfig);
            defaultParamsConfig.defaultParams = {abc: '1'};

            resource = factory(defaultParamsConfig);
            expect(promise = resource.get({nestedId: 1234, id: 123})).toBeDefined();

            $httpBackend.flush();
        }));

        it('should be able to turn off root mapping and field renaming', inject(function($httpBackend) {
            var promise, result, resource;

            $httpBackend.expectGET('/nested/1234/test/123').respond(200, {id: 123, nested_id: 1234, abc_def: 'xyz'});

            resource = factory(nestedConfig);
            resource.responseInterceptors = [];
            resource.requestTransformers = [];
            expect(promise = resource.get({nestedId: 1234, id: 123})).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(result).toBeInstanceOf(resource);
            expect(result).toEqualData({id: 123, nested_id: 1234, abc_def: 'xyz'});
        }));

        it('should be able to turn off root mapping but keep field renaming', inject(function($httpBackend) {
            var promise, result, resource, testConfig = {};

            $httpBackend.expectGET('/nested/1234/test/123').respond(200, {id: 123, nested_id: 1234, abc_def: 'xyz'});

            angular.copy(nestedConfig, testConfig);
            testConfig.requestTransformers = [];
            testConfig.responseInterceptors = ['railsFieldRenamingInterceptor'];
            resource = factory(testConfig);

            expect(promise = resource.get({nestedId: 1234, id: 123})).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(result).toBeInstanceOf(resource);
            expect(result).toEqualData({id: 123, nestedId: 1234, abcDef: 'xyz'});
        }));

        it('should be able to create new instance and save it', inject(function($httpBackend) {
            var data = new NestedTest({nestedId: 1234, abcDef: 'xyz'});

            $httpBackend.expectPOST('/nested/1234/test', {nested_test: {nested_id: 1234, abc_def: 'xyz'}}).respond(200, {nested_test: {id: 123, nested_id: 1234, abc_def: 'xyz'}});
            data.nestedId = 1234;
            data.create();
            $httpBackend.flush();

            expect(data).toEqualData({id: 123, nestedId: 1234, abcDef: 'xyz'});
        }));

        it('should be able to create new instance and update it', inject(function($httpBackend) {
            var data = new NestedTest({abcDef: 'xyz'});

            $httpBackend.expectPOST('/nested/1234/test', {nested_test: {abc_def: 'xyz', nested_id: 1234}}).respond(200, {nested_test: {id: 123, nested_id: 1234, abc_def: 'xyz'}});
            data.nestedId = 1234;
            data.create();
            $httpBackend.flush(1);

            expect(data).toEqualData({id: 123, nestedId: 1234, abcDef: 'xyz'});

            $httpBackend.expectPUT('/nested/1234/test/123', {nested_test: {id: 123, xyz: 'abc', abc_def: 'xyz', nested_id: 1234}}).respond(200, {nested_test: {id: 123, nested_id: 1234, abc_def: 'xyz', xyz: 'abc', extra: 'test'}});
            data.xyz = 'abc';
            data.update();
            $httpBackend.flush();

            expect(data).toEqualData({id: 123, nestedId: 1234, abcDef: 'xyz', xyz: 'abc', extra: 'test'});
        }));

        it('create with default params should add parameter abc=1', inject(function($httpBackend) {
            var promise, Resource, data, defaultParamsConfig = {};

            $httpBackend.expectPOST('/nested/1234/test?abc=1', {nested_test: {nested_id: 1234}}).respond(200, {nested_test: {id: 123, nested_id: 1234}});

            angular.copy(nestedConfig, defaultParamsConfig);
            defaultParamsConfig.defaultParams = {abc: '1'};

            Resource = factory(defaultParamsConfig);
            data = new Resource();
            data.nestedId = 1234;
            data.create();

            $httpBackend.flush();
        }));

        it('should be able to get resource and update it', inject(function($httpBackend) {
            var promise, result;

            $httpBackend.expectGET('/nested/1234/test/123').respond(200, {nested_test: {id: 123, nested_id: 1234, abc: 'xyz'}});

            expect(promise = NestedTest.get({nestedId: 1234, id: 123})).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(result).toBeInstanceOf(NestedTest);
            expect(result).toEqualData({id: 123, nestedId: 1234, abc: 'xyz'});

            $httpBackend.expectPUT('/nested/1234/test/123', {nested_test: {id: 123, abc: 'xyz', xyz: 'abc', nested_id: 1234}}).respond(200, {nested_test: {id: 123, nested_id: 1234, abc_def: 'xyz', xyz: 'abc', extra: 'test'}});
            result.xyz = 'abc';
            result.update();
            $httpBackend.flush();

            // abc was originally set on the object so it should still be there after the update
            expect(result).toEqualData({id: 123, nestedId: 1234, abc: 'xyz', abcDef: 'xyz', xyz: 'abc', extra: 'test'});
        }));

        it('update should handle 204 response', inject(function($httpBackend) {
            var promise, result;

            $httpBackend.expectGET('/nested/1234/test/123').respond(200, {nested_test: {id: 123, nested_id: 1234, abc: 'xyz'}});

            expect(promise = NestedTest.get({nestedId: 1234, id: 123})).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(result).toBeInstanceOf(NestedTest);
            expect(result).toEqualData({id: 123, nestedId: 1234, abc: 'xyz'});

            $httpBackend.expectPUT('/nested/1234/test/123', {nested_test: {id: 123, abc: 'xyz', xyz: 'abc', nested_id: 1234}}).respond(204);
            result.xyz = 'abc';
            result.update();
            $httpBackend.flush();

            expect(result).toEqualData({id: 123, nestedId: 1234, abc: 'xyz', xyz: 'abc'});
        }));

        it('should be able to delete instance returned from get', inject(function($httpBackend) {
            var promise, result;

            $httpBackend.expectGET('/nested/1234/test/123').respond(200, {nested_test: {id: 123, nestedId: 1234, abc: 'xyz'}});

            expect(promise = NestedTest.get({nestedId: 1234, id: 123})).toBeDefined();

            promise.then(function (response) {
                result = response;
            });

            $httpBackend.flush();

            expect(result).toBeInstanceOf(NestedTest);
            expect(result).toEqualData({id: 123, nestedId: 1234, abc: 'xyz'});

            $httpBackend.expectDELETE('/nested/1234/test/123').respond(204);
            result.remove();
            $httpBackend.flush();
        }));

        it('should be able to create new instance and update it', inject(function($httpBackend) {
            var data = new NestedTest({abcDef: 'xyz'});

            $httpBackend.expectPOST('/nested/1234/test', {nested_test: {abc_def: 'xyz', nested_id: 1234}}).respond(200, {nested_test: {id: 123, nested_id: 1234, abc_def: 'xyz'}});
            data.nestedId = 1234;
            data.create();
            $httpBackend.flush(1);

            expect(data).toEqualData({id: 123, nestedId: 1234, abcDef: 'xyz'});
            expect(data).toBeInstanceOf(NestedTest);

            $httpBackend.expectDELETE('/nested/1234/test/123').respond(204);
            data.remove();
            $httpBackend.flush();
        }));

        it('delete with default params should add parameter abc=1', inject(function($httpBackend) {
            var Resource, data, defaultParamsConfig = {};

            $httpBackend.expectDELETE('/nested/1234/test/123?abc=1').respond(204);

            angular.copy(nestedConfig, defaultParamsConfig);
            defaultParamsConfig.defaultParams = {abc: '1'};

            Resource = factory(defaultParamsConfig);
            data = new Resource();
            data.id = 123;
            data.nestedId = 1234;
            data.remove();

            $httpBackend.flush();
        }));
    });

});
