'use strict';

const
    gulp = require('gulp'),
    nunjucksRender = require('gulp-nunjucks-render'),
    livereload = require('gulp-livereload'),
    sourcemaps = require('gulp-sourcemaps'),
    autoprefixer = require('autoprefixer'),
    cleancss = require('gulp-cleancss'),
    postcss = require('gulp-postcss'),
    mqpacker = require('css-mqpacker'),
    gulpIf = require('gulp-if'),
    uncss = require('gulp-uncss'),
    ghPages = require('gulp-gh-pages'),
    newer = require('gulp-newer'),
    imagemin = require('gulp-imagemin'),
    pngquant = require('imagemin-pngquant'),
    notify = require('gulp-notify'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
//svgmin = require('gulp-svgmin'),
//svgstore = require('gulp-svgstore'),
    browserSync = require('browser-sync').create(),
    sass = require('gulp-ruby-sass');

gulp.task('serve', serve);
gulp.task('reload', reload);
gulp.task('html', html);
gulp.task('scss', scss);
gulp.task('img', img);
gulp.task('js', js);

gulp.task('default', gulp.series(
    gulp.parallel('html', 'scss', 'img', 'js'),
    'serve'
));

let isDev = true;

let path = {
    scripts: [
        'bower_components/jquery/dist/jquery.js',
        'source/scripts/**/*.js'
    ]
};

function serve() {
    browserSync.init({
        server: 'build',
        port: 3000,
        startPath: 'index.html'
    });
    gulp.watch('source/**/*.html', gulp.series('html', 'reload'));
    gulp.watch('source/styles/**/*.scss', gulp.series('scss', 'reload'));
    gulp.watch('source/img/**/*', gulp.series('img', 'reload'));
    gulp.watch('source/scripts/**/*', gulp.series('js', 'reload'));
}

function html() {
    return gulp
        .src([
            'source/**/*.html',
            '!**/_*/**'
        ])
        .pipe(nunjucksRender({
            path: ['source']
        }))
        .pipe(gulp.dest('build'));
}

function scss() {
    return sass('source/styles/main.scss', {sourcemap: true})
        .on('error', sass.logError)
        .pipe(gulpIf(isDev, sourcemaps.init()))
        .pipe(postcss([
            autoprefixer({browsers: ['last 2 version']}),
            mqpacker
        ]))
        .pipe(gulpIf(!isDev, cleancss()))
        //.pipe(gulpIf(!isDev, uncss({html: ['source/**/*.html']})))
        .pipe(gulpIf(isDev, sourcemaps.write()))
        .pipe(gulp.dest('build/css'))
        .pipe(browserSync.stream());
}

function svgstore_try(callback) {
    return gulp
        .src('source/svg/**/*.svg')
        .pipe(svgmin(function (file) {
            return {
                plugins: [{
                    cleanupIDs: {
                        minify: true
                    }
                }]
            }
        }))
        .pipe(svgstore({inlineSvg: true}))
        .pipe(cheerio(function ($) {
            $('svg').attr('style', 'display:none');
        }))
        .pipe(rename('sprite-svg--ls.svg'))
        .pipe(gulp.dest(dirs.source + '/blocks/sprite-svg--localstorage/img'));
}

function deploy() {
    isDev = false;
    return gulp
        .src('build/**/*')
        .pipe(ghPages());
}

function reload(done) {
    browserSync.reload();
    done();
}

function img() {
    return gulp
        .src('source/img/**/*.{jpg,jpeg,gif,png,svg}', {since: gulp.lastRun('img')})
        .pipe(newer('build/img'))
        .pipe(imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        }))
        .pipe(gulp.dest('build/img'));
}

function js() {
    return gulp
        .src(path.scripts)
        .pipe(gulpIf(isDev, sourcemaps.init()))
        .pipe(concat('script.min.js'))
        .pipe(gulpIf(!isDev, uglify()))
        .on('error', notify.onError(function (err) {
            return {
                title: 'Javascript uglify error',
                message: err.message
            }
        }))
        .pipe(gulpIf(isDev, sourcemaps.write('.')))
        .pipe(gulp.dest('build/js'));
}