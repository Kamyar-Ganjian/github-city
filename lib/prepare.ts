import { FileNode } from './model';
import { Building, City, District, layout } from './layout';
import { indexRepository, RepositoryIndex } from './explorer';
import { wholeCity, WholeCity } from './whole-city';
export interface PreparedRepository {
    index: RepositoryIndex;
    city: City;
    whole: WholeCity;
    buildings: Map<string, Building>;
    districts: Map<string, District>;
}
export function prepareRepository(files: FileNode[]): PreparedRepository {
    const city = layout(files);
    return { index: indexRepository(files), city, whole: wholeCity(city), buildings: new Map(city.buildings.map(b => [b.file.path, b])), districts: new Map(city.districts.map(d => [d.path, d])) };
}
