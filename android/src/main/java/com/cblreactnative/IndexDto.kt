package com.cblreactnative

import com.couchbase.lite.FullTextIndexItem
import com.couchbase.lite.ValueIndexItem

data class IndexDto(val name: String,
                    val type:String,
                    val language: String? = null,
                    val ignoreAccents: Boolean? = null,
                    val valueItems: Array<ValueIndexItem>,
                    val fullTextItems: Array<FullTextIndexItem>
) {
  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    if (javaClass != other?.javaClass) return false

    other as IndexDto

    if (name != other.name) return false
    if (type != other.type) return false
    if (!valueItems.contentEquals(other.valueItems)) return false
    if (!fullTextItems.contentEquals(other.fullTextItems)) return false

    return true
  }

  override fun hashCode(): Int {
    val result = 31 * name.hashCode() + type.hashCode() + valueItems.contentHashCode() + fullTextItems.contentHashCode()
    return result
  }
}
