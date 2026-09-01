import { IsNotEmpty, IsString, IsNumber, IsArray, IsBoolean, IsOptional, IsEnum, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductCategory {
  ROPA = 'ropa',
  ACCESORIOS = 'accesorios',
  DIGITAL = 'digital',
  IMPRESOS = 'impresos',
}

export enum Currency {
  USD = 'USD',
  MXN = 'MXN',
  COP = 'COP',
  ARS = 'ARS',
  CLP = 'CLP',
  PEN = 'PEN',
  EUR = 'EUR',
}

export class ProductVariantDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsNumber()
  @IsOptional()
  priceModifier?: number;
}

export class StockByCountryDto {
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  reserved?: number;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  projectIds?: string[];

  @IsEnum(ProductCategory)
  category: ProductCategory;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: {
    projects?: string[];
    types?: string[];
    countries?: string[];
    isOffer?: boolean;
  };

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  @IsOptional()
  variants?: ProductVariantDto[];
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateStockDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  variantId: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsNumber()
  @Min(0)
  quantity: number;
}

export class ProductFiltersDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  isOffer?: boolean;

  @IsOptional()
  @IsString()
  country?: string;
}
