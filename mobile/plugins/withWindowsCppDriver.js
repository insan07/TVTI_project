const { withProjectBuildGradle, withAppBuildGradle } = require('expo/config-plugins');
// CMake shortens clang++.exe to CLANG_~1.EXE when the Windows SDK path has spaces.
// Preserve C++ driver mode (and shared-runtime linking) in every native target.
const rootGradle = "// TVTI Windows C++ driver\nif (System.getProperty('os.name').toLowerCase().contains('windows')) {\n  subprojects { subproject ->\n    subproject.plugins.withId('com.android.library') {\n      subproject.extensions.getByName('android').defaultConfig.externalNativeBuild.cmake.cppFlags.add('--driver-mode=g++')\n    }\n  }\n}\n";
const appGradle = "// TVTI Windows application C++ driver\nif (System.getProperty('os.name').toLowerCase().contains('windows')) {\n  android {\n    defaultConfig {\n      externalNativeBuild {\n        cmake {\n          cppFlags '--driver-mode=g++'\n          arguments '-DCMAKE_CXX_COMPILER_ARG1=--driver-mode=g++'\n        }\n      }\n    }\n  }\n}\n";
module.exports = config => {
  config = withProjectBuildGradle(config, next => { if (!next.modResults.contents.includes('// TVTI Windows C++ driver')) next.modResults.contents += '\n' + rootGradle; return next; });
  return withAppBuildGradle(config, next => { if (!next.modResults.contents.includes('// TVTI Windows application C++ driver')) next.modResults.contents += '\n' + appGradle; return next; });
};
