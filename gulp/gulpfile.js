'use strict';
var path = require('path');
var gulp = require('gulp');
var _ = require('gulp-load-plugins')();
var pump = require('pump');
var runSequence = require('run-sequence');
var args = require('get-gulp-args')();
var del = require('del');

// 默认为生成环境
var prodEnv = !!args.prod || !args.dev;

var prodPath = './dist',
  devPath = './dev',
  srcPath = './src';

var dest = prodEnv ? prodPath : devPath;

var resource = {
  scss: path.join(srcPath, '**/*.scss'),
  image: [
    path.join(srcPath, '/assets/img/**'),
    path.join(srcPath, './favicon.ico')
  ],
  js: path.join(srcPath, '**/*.js'),
  font: path.join(srcPath, '/assets/fonts/**'),
  html: path.join(srcPath, '**/*.html')
};

gulp.task('sass', function() {
  return gulp.src(resource.scss)
    .pipe(_.sass({
        outputStyle: prodEnv ? 'compressed' : 'expanded',
        sourceComments: 'normal'
      })
      .on('error', _.sass.logError))
    .pipe(_.autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false
    }))
    .pipe(_.if(prodEnv, _.minifyCss()))
    .pipe(gulp.dest(devPath))
    .pipe(_.connect.reload())
})

gulp.task('js', function() {
  return gulp.src(resource.js)
    .pipe(_.if(prodEnv, _.uglify()))
    .pipe(gulp.dest(devPath))
    .pipe(_.connect.reload())
})

gulp.task('html', function() {
  gulp.src(resource.html)
    .pipe(_.if(prodEnv, _.htmlmin({ collapseWhitespace: true })))
    .pipe(gulp.dest(devPath))
    .pipe(_.connect.reload())
})

gulp.task('image', function() {
  return gulp.src(resource.image, { base: 'src' })
    .pipe(_.if(prodEnv, _.imagemin()))
    .pipe(gulp.dest(devPath))
})

gulp.task('font', function() {
  return gulp.src(resource.font, { base: 'src' })
    .pipe(gulp.dest(devPath))
})

gulp.task('watch', function() {
  // css
  gulp.watch(resource.scss, ['sass']);

  // html
  gulp.watch(resource.html, ['html']);

  // js
  gulp.watch(resource.js, ['js']);
})

gulp.task('server', function() {
  _.connect.server({
    root: dest,
    livereload: !prodEnv,
    port: 8085,
    middleware: function(connect, opts) {
      let middlewares = [];
      let url = require('url');
      let proxy = require('proxy-middleware');
      var mockServe = function() {
        var proxyUrl = `http://127.0.0.1:3002`
        var proxyOptions = url.parse(proxyUrl);
        proxyOptions.route = '/mockapi';
        return proxy(proxyOptions);
      };
      middlewares.push(mockServe());
      return middlewares;
    }
  })
})

gulp.task('revision', function() {
  // 进行 md5
  return gulp.src([
      `./${devPath}/**/*.*`,
      `!./${devPath}/**/*.html`,
      `!./${devPath}/favicon.ico`,
      `!./${devPath}/assets/fonts/**`
    ])
    .pipe(_.rev())
    .pipe(gulp.dest(dest))
    .pipe(_.rev.manifest())
    .pipe(gulp.dest(dest))
    .on('end', function() {
      // 将不需要md5文件直接copy
      gulp.src([
          `./${devPath}/**/*.html`,
          `./${devPath}/favicon.ico`,
          `./${devPath}/**/fonts/**`
        ])
        .pipe(gulp.dest(dest))
        .on('end', function() {
          var manifestPath = `${dest}/rev-manifest.json`;
          var manifest = gulp.src(manifestPath);
          // replace
          gulp.src(path.join(dest, '/**/*.*'))
            .pipe(_.revReplace({ manifest: manifest }))
            .pipe(gulp.dest(dest))
            // md5完成后删除 rev-manifest.json
            .on('end', function() {
              del(manifestPath);
            })
        })
    })
})

gulp.task('build', function(cb) {
  var staticTasks = ['sass', 'js', 'html', 'image', 'font'];
  var envTasks = prodEnv ? ['revision'] : ['server', 'watch'];
  runSequence('clean', staticTasks, envTasks, cb)
})

gulp.task('clean', function() {
  del.sync(prodEnv ? prodPath : devPath);
})
