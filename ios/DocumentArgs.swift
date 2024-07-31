//
//  DocumentArgs.swift
//  cbl-reactnative
//
//  Created by Aaron LaBeau on 7/29/24.
//

import Foundation
import CouchbaseLiteSwift

public class DocumentArgs {
    public var documentId: String = ""
    public var concurrencyControlValue: ConcurrencyControl? = nil
}
