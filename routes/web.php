<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::get('barkada', fn () => Inertia::render('barkada', ['view' => 'home']))->name('barkada');
    Route::get('barkada/members', fn () => Inertia::render('barkada', ['view' => 'members']))->name('barkada.members');
    Route::get('barkada/budget', fn () => Inertia::render('barkada', ['view' => 'budget']))->name('barkada.budget');
    Route::get('barkada/expenses', fn () => Inertia::render('barkada', ['view' => 'expenses']))->name('barkada.expenses');
    Route::get('barkada/settlement', fn () => Inertia::render('barkada', ['view' => 'settlement']))->name('barkada.settlement');
    Route::get('barkada/categories', fn () => Inertia::render('barkada', ['view' => 'categories']))->name('barkada.categories');
    Route::get('barkada/carpools', fn () => Inertia::render('barkada', ['view' => 'carpools']))->name('barkada.carpools');
});

require __DIR__.'/settings.php';
