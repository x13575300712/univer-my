import type { DocumentDataModel, Nullable } from '@univerjs/core';
import { DOCS_NORMAL_EDITOR_UNIT_ID_KEY, IUniverInstanceService } from '@univerjs/core';
import { DocumentViewModel } from '@univerjs/engine-render';
import type { IDisposable } from '@wendellhu/redi';
import { BehaviorSubject } from 'rxjs';

export interface IDocumentViewModelManagerParam {
    unitId: string;
    docViewModel: DocumentViewModel;
}

/**
 * The view model manager is used to manage Doc view model. has a one-to-one correspondence with the doc skeleton.
 */
export class DocViewModelManagerService implements IDisposable {
    private _currentViewModelUnitId: string = '';
    private _docViewModelMap: Map<string, IDocumentViewModelManagerParam> = new Map();

    private readonly _currentDocViewModel$ = new BehaviorSubject<Nullable<IDocumentViewModelManagerParam>>(null);

    readonly currentDocViewModel$ = this._currentDocViewModel$.asObservable();

    constructor(@IUniverInstanceService private readonly _currentUniverService: IUniverInstanceService) {}

    dispose(): void {
        this._currentDocViewModel$.complete();
        this._docViewModelMap = new Map();
    }

    getCurrent() {
        return this._docViewModelMap.get(this._currentViewModelUnitId);
    }

    getViewModel(unitId: string) {
        return this._docViewModelMap.get(unitId)?.docViewModel;
    }

    setCurrent(unitId: string) {
        const documentDataModel = this._currentUniverService.getUniverDocInstance(unitId);
        if (documentDataModel == null) {
            throw new Error(`Document data model with id ${unitId} not found when build view model.`);
        }

        // No need to build view model, if data model has no body.
        if (documentDataModel.getBody() == null) {
            return;
        }

        if (!this._docViewModelMap.has(unitId)) {
            const docViewModel = this._buildDocViewModel(documentDataModel);

            this._docViewModelMap.set(unitId, {
                unitId,
                docViewModel,
            });
        }

        // Always need to reset document data model, because cell editor change doc instance every time.
        if (unitId === DOCS_NORMAL_EDITOR_UNIT_ID_KEY) {
            const docViewModel = this._docViewModelMap.get(unitId)?.docViewModel;

            if (docViewModel == null) {
                return;
            }

            docViewModel.reset(documentDataModel);
        }

        this._currentViewModelUnitId = unitId;

        this._currentDocViewModel$.next(this.getCurrent());
    }

    private _buildDocViewModel(documentDataModel: DocumentDataModel) {
        return new DocumentViewModel(documentDataModel);
    }
}