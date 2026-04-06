require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "cbl-reactnative"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/Couchbase-Ecosystem/cbl-reactnative", :tag => "#{s.version}" }

  s.swift_version = '5.5'
  s.dependency 'CouchbaseLite-Swift-Enterprise', '3.3.0'
  s.source_files = "ios/**/*.{h,m,mm,swift}"

  install_modules_dependencies(s)
end
