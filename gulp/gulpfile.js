'use strict';
var path = require('path');
var gulp = require('gulp');
var _ = require('gulp-load-plugins')();
var pump = require('pump');
var runSequence = require('run-sequence');
var args = require('get-gulp-args')();
var vinylPaths = require('vinyl-paths');
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


gulp.task('sass', () => {
  return gulp.src(resource.scss)
    .pipe(_.sass({
      outputStyle: prodEnv ? 'compressed' : 'expanded',
      sourceComments: 'normal'
    }).on('error', _.sass.logError))
    .pipe(_.autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false
    }))
    .pipe(_.if(prodEnv, _.minifyCss()))
    .pipe(gulp.dest(dest))
    .pipe(_.connect.reload())
})

gulp.task('js', (cb) => {
  pump([
      gulp.src(resource.js),
      // _.uglify(),
      gulp.dest(dest),
      _.connect.reload()
    ],
    cb
  );
})

gulp.task('html', () => {
  gulp.src(resource.html)
    .pipe(_.if(prodEnv, _.htmlmin({ collapseWhitespace: true })))
    .pipe(gulp.dest(dest))
    .pipe(_.connect.reload())
})

gulp.task('image', () => {
  return gulp.src(resource.image, { base: 'src' })
    .pipe(_.if(prodEnv, _.imagemin()))
    .pipe(gulp.dest(dest))
})

gulp.task('font', () => {
  return gulp.src(resource.font, { base: 'src' })
    .pipe(gulp.dest(dest))
})

gulp.task('watch', () => {
  // css
  gulp.watch(resource.scss, ['sass']);

  // html
  gulp.watch(resource.html, ['html']);

  // js
  gulp.watch(resource.js, ['js']);
})

gulp.task('server', () => {
  _.connect.server({
    root: dest,
    livereload: !prodEnv,
    port: 8085,
    middleware: (connect, opts) => {
      let middlewares = [];
      let url = require('url');
      let proxy = require('proxy-middleware');
      let msPort = args.msPort || 3000;

      var mockServerProxy = () => {
        var proxyUrl = `http://127.0.0.1:${ args.msgPort || 3002 }`
        var proxyOptions = url.parse(proxyUrl);
        proxyOptions.route = '/mockapi';
        return proxy(proxyOptions);
      };

      middlewares.push(mockServerProxy());

      return middlewares;
    }
  });
})

gulp.task('revision', () => {
  var vp = vinylPaths();
  return gulp.src([
      `./${devPath}/**/*.*`,
      `!./${devPath}/index.html`,
      `!./${devPath}/favicon.ico`,
      `!./${devPath}/assets/fonts/**`
    ])
    .pipe(gulp.dest(dest))
    .pipe(vp)
    .pipe(_.rev())
    .pipe(gulp.dest(dest))
    .pipe(_.rev.manifest())
    .pipe(gulp.dest(dest))
    .on('end', () => {
      var manifestPath = `${dest}/rev-manifest.json`;
      var manifest = gulp.src(manifestPath);
      gulp.src(path.join(dest, '/**/*.*'))
        .pipe(_.revReplace({ manifest: manifest }))
        .pipe(gulp.dest(dest))
        .on('end', () => {
          del(vp.paths);
          del(manifestPath);
        })
    })
})

gulp.task('build', (cb) => {
  var staticTasks = ['sass', 'js', 'html', 'image', 'font'];
  var envTasks = prodEnv ? ['revision'] : ['server', 'watch'];
  runSequence('clean', staticTasks, envTasks, cb)
})

gulp.task('clean', function() {
  del.sync(prodEnv ? prodPath : devPath);
})
