const path = require('path')
const webpack = require("webpack")
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const HtmlWebPackPlugin = require('html-webpack-plugin')

module.exports = {
    entry: {
        'index': './src/index.js',
    },
    target: 'web',
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'build'),
    },
    module: {
        rules: [
            { test: /\.html$/, loader: 'html-loader' },
            { test: /\.js$/, loader: 'babel-loader', exclude: /node_modules/ },
            { test: /\.css$/, loader: "style-loader!css-loader" },
            { test: /\.scss$/, loader: "style-loader!css-loader!sass-loader" },
            { test: /\.(woff|woff2)(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=application/font-woff&name=./dist/fonts/[name]/[hash].[ext]' },
            { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=application/octet-stream&name=./dist/fonts/[name]/[hash].[ext]' },
            { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader?name=./dist/fonts/[name]/[hash].[ext]' },
            { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=image/svg+xml&name=./dist/fonts/[name]/[hash].[ext]' },
            { test: /\.(png|jpg|gif)$/, loader: "file-loader?name=./dist/images/[name].[ext]" },
            { test: /\.json$/, loader: "json-loader" },
        ],
    },
    plugins: [
        new HtmlWebPackPlugin({
            template: './src/index.html',
            filename: 'index.html',
        }),
    ],
    optimization: {
        minimizer: [
            new UglifyJsPlugin({
                cache: true,
                parallel: true,
                uglifyOptions: {
                    compress: false,
                    ecma: 6,
                    mangle: true,
                },
                sourceMap: true,
            }),
        ],
    },
    node: {
        fs: "empty", // avoid error for missing 'fs' module
    },
    devtool: 'source-map',
    devServer: {
        contentBase: path.join(__dirname, 'build'),
        host: 'localhost',
        port: 8081,
        progress: true,
        compress: true,
        inline: true,
    },
};
