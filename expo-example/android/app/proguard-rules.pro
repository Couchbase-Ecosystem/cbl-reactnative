# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Couchbase Lite - Keep all classes and methods
-keep class com.couchbase.lite.** { *; }
-keep class com.couchbase.litecore.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep Kotlin metadata for Couchbase Lite Kotlin extensions
-keep class kotlin.Metadata { *; }
-keep class kotlin.reflect.** { *; }

# Keep our React Native module
-keep class com.cblreactnative.** { *; }
-keep class cbl.js.kotlin.** { *; }

# Keep J2V8 (JavaScript engine used for filters)
-keep class com.eclipsesource.v8.** { *; }
-keepclassmembers class com.eclipsesource.v8.** { *; }

# Keep enums (used for ReplicatorType, ActivityLevel, etc.)
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep serialization classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Add any project specific keep options here:
